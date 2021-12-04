<script>
	import { onMount } from 'svelte';
	import { zeros, reshape, mean, transpose } from 'mathjs'
	import { GPU } from 'gpu.js';
  
  const gpu = new GPU({
    // mode: 'dev', 'webgl', 'webgl2', 'headlessgl', 'cpu'
    mode: 'dev' // idk why but dev and cpu are the fastest on my machine
  })

  let fifData = localStorage.getItem('lastCompressedJSON')

	function handleCompress() {
		const convertedImage = document.getElementById("convertedImage");
		const transformations = compress(convertedImage, 8, 4, 8)
    const json = {
      "source_size": 8,
      "destination_size": 4,
      "step": 8,
      "transformations": transformations
    }

    fifData = JSON.stringify(json)
    localStorage.setItem('lastCompressedJSON', fifData);
	}

	const directions = [1, -1]
	const angles = [0, 90, 180, 270]
	const candidates = [[1, 0], [1, 90], [1, 180], [1, 270], [-1, 0], [-1, 90], [-1, 180], [-1, 270]]

	function convertImgToCanvas() {
		const srcImage = document.getElementById("srcImage");

		srcImage.onload = function () {
			const convertedImage = document.getElementById("convertedImage");
			const context = convertedImage.getContext("2d");

			context.drawImage(srcImage, 0, 0, 128, 128);
		};
	}

//   function reduce(S, factor) {
// 	  const size = Math.floor(S.size / factor);
// 	  let result = zeros(size)
// 	  for (let i=0; i<size; i++) {
// 		for (let j=0; j<size; j++) {
// 			result[i][j] = mean(subset(S, index([i*factor, j*factor], size)))
// 		}
// 	  }

// 	  return result
//   }

  function generate_all_transformed_blocks(img, source_size, destination_size, step) {
    let factor = Math.floor(source_size / destination_size)
    let transformed_blocks = []

    for (let k = 0; k < img.canvas.width - source_size; k += step) {
      for (let l = 0; l < img.canvas.height - source_size; l += step) {
        let SUnreduced = img.getImageData(k, l, source_size, source_size)
        let SGrayscaled = get_greyscale_image(SUnreduced)
		    let S = reduce(SGrayscaled, factor)
        for (let [direction, angle] of candidates) {
          transformed_blocks.push([k/8, l/8, direction, angle, apply_transformation(S, direction, angle)])
        }
      }
    }

	return transformed_blocks
  }

//   function get_greyscale_image(img) {
//     let rgbaSize = 4
//     let matrix = []

//     for(let height=0; height < img.height; height++) {
//       let array = []
//       for(let width=0; width < img.width * rgbaSize; width += rgbaSize) {
//         let sliceStart = height * img.width + width
//         let [r, g, b, a] = img.data.slice(sliceStart, sliceStart + rgbaSize)
//         array.push(MathJS.mean(r, g, b) * a)
//       }

//       matrix.push(array)
//     }

//     return matrix
//   }

  function get_greyscale_image(img) {
    let rgbaSize = 4
    let ctr = 0
    let imgData = []

    for(let i = 0; i < img.data.length; i += rgbaSize, ctr++) {
      let [r, g, b, a] = img.data.slice(i, i+rgbaSize)
      // 255 red, 80 green, 22 blue, a = 0.2 => 119 * 0.2
      imgData[ctr] = mean(r, g, b)
    }
    return reshape(imgData, [img.height, img.width])
  }

  function find_contrast_and_brightness(matrix, otherMatrix) {
    let contrast = 0.75

    // matrix[1, 2, 5, 4] - 0.75 * matrix[4, 1, 3, 7]
    let brightness = (matrixSum(matrix) - contrast * matrixSum(otherMatrix)) / matrix.length
    return [contrast, brightness]

    // [12, 2,12 ,34 ,4 ,34, 43


    // def find_contrast_and_brightness1(D, S):
    //   # Fix the contrast and only fit the brightness
    //   contrast = 0.75
    //   brightness = (np.sum(D - contrast*S)) / D.size
    //   return contrast, brightness
    //
    // def find_contrast_and_brightness2(D, S):
    //     # Fit the contrast and the brightness
    //     A = np.concatenate((np.ones((S.size, 1)), np.reshape(S, (S.size, 1))), axis=1)
    //     b = np.reshape(D, (D.size,))
    //     x, _, _, _ = np.linalg.lstsq(A, b)
    //     #x = optimize.lsq_linear(A, b, [(-np.inf, -2.0), (np.inf, 2.0)]).x
    //     return x[1], x[0]
  }

  const gpuSquareSubstracted = gpu.createKernel(function(matrix, otherMatrix) {
    const substracted = matrix[this.thread.y][this.thread.x] - otherMatrix[this.thread.y][this.thread.x]
    return substracted * substracted
  }, { dynamicOutput: true })

	function compress(canvas, source_size, destination_size, step) {
    let img = canvas.getContext('2d')
    // let img = context.getImageData(0, 0, context.width, context.height)

    let transformations = []
    let transformed_blocks = generate_all_transformed_blocks(img, source_size, destination_size, step)
    let i_count = Math.floor(img.canvas.width / destination_size)
    let j_count = Math.floor(img.canvas.height / destination_size)

    for (let i = 0; i < i_count; i++) {
      transformations.push([]);
      for (let j = 0; j < j_count; j++) {
        console.log(`New block ${i} ${j}`)
        transformations[i].push([])
        let min_d = Infinity
        // Extract the destination block

        let DColored = img.getImageData(i * destination_size, j * destination_size, destination_size, destination_size)
        let D = get_greyscale_image(DColored)
        // Test all possible transformations and take the best one
        for (let [k, l, direction, angle, S] of transformed_blocks) {
          let [contrast, brightness] = find_contrast_and_brightness(D, S)

          multiplyMatrix.setOutput([destination_size, destination_size]);
          gpuSquareSubstracted.setOutput([destination_size, destination_size])
          
          multiplyMatrix.setPipeline(true)
          S = multiplyMatrix(S, contrast, brightness)
          let d = matrixSum(gpuSquareSubstracted(D, S))
          if (d < min_d) {
            min_d = d
            transformations[i][j] = [k, l, direction, angle, contrast, brightness]
          }
        }
      }
    }

    return transformations
  }

  function decompressUserJSON(){
    const json = JSON.parse(document.querySelector('#userJSON').value)
    drawJSON(json, '#decompressedImage')
  }

  async function decompressDummyImage(){
    fetch('monkey_test.json')
      .then(response => response.json())
      .then( (compressedImageData) => {
        drawJSON(compressedImageData, '#decompressedMonkey')
      })
  }

  function drawJSON(json, canvasSelector){
    const { transformations, source_size, destination_size, step } = json
    const decompressedImages = decompress(transformations, source_size, destination_size, step)
    const canvas = document.querySelector(canvasSelector)
    const ctx = canvas.getContext('2d')
    const lastImage = decompressedImages[decompressedImages.length -1]
    for(let y = 0; y < lastImage.length; y++){
      for(let x = 0; x < lastImage[y].length; x++){
        ctx.beginPath()
        const grayScaleValue = Math.floor(lastImage[y][x])
        ctx.fillStyle = `rgb(
          ${grayScaleValue},
          ${grayScaleValue},
          ${grayScaleValue}
        )`
        ctx.fillRect(x, y, 1, 1)
        ctx.fill()
      }
    }
  }

	function decompress(transformations, source_size, destination_size, step, iterations=8){
	  // transformations: Matrix with transformation metadata at each point (x, y)
	  // source_size: width and height of the uncompressed image
    // destination_size: compressed image dimensions
		// step: minimum x/y translation of the transformation slices
		// interations: decompression steps, higher is better (and slower)
  	const factor = Math.floor(source_size / destination_size)
    const height = transformations.length * destination_size
    const width = transformations[0].length * destination_size

    let decompressedImages = []
    decompressedImages.push(zeros(height, width)._data)
		for(let iteration = 0; iteration < iterations; iteration++){
			console.log(`Starting iteration: ${iteration}`)
      let currentImage = zeros(height, width)._data
			for(let y = 0; y < transformations.length; y++){
				for(let x = 0; x < transformations[y].length; x++){
       		// Apply transformation
          const [sourceY, sourceX, flip, angle, contrast, brightness] = transformations[y][x]
          const lastImage = decompressedImages[decompressedImages.length - 1]
       		const reducedImage = reduce(matrixSubset(lastImage, sourceY * step, sourceY * step + source_size, sourceX * step, sourceX * step + source_size), factor)
       		const transformedImage = apply_transformation(reducedImage, flip, angle, contrast, brightness)
          
          // hard to do in the GPU as we replace only a subset of currentImage - we cannot use the "result" nor iterate over pixels
          // const modifyImage = gpu.createKernel(function(transformedImage, destination_size, transformationY, transformationX) {
          //   return transformedImage[this.thread.y - transformationY / destination_size][this.thread.x - transformationX / destination_size]
          // }).setOutput([reducedWidth, reducedHeight]);

          // currentImage = modifyImage(transformedImage, destination_size, y, x).map((y) => Array.from(y))
          for(let dY = 0; dY < transformedImage.length; dY++) {
            for(let dX = 0; dX < transformedImage[dY].length; dX++) {
              currentImage[y * destination_size + dY][x * destination_size + dX] = transformedImage[dY][dX]
            }
          }
				}
			}
      decompressedImages.push(currentImage)
		}
		return decompressedImages
	}
	
	function apply_transformation(img, direction, angle, contrast = 1.0, brightness = 0.0){
		// img: matrix
		// direction: 1 or -1
		// angle: 0, 90, 180, 270
		const imageClone = img // flip and rotate operate in place

		return gpuModify(rotate(flip(img, direction), angle), contrast, brightness)
	}

  const multiplyMatrix = gpu.createKernel(function(matrix, multiplicant, summand) {
    return matrix[this.thread.y][this.thread.x] * multiplicant + summand
  }, { dynamicOutput: true })

  function gpuModify(matrix, multiplicant = 1, summand = 0){
    const width = matrix.length
    const height = matrix[0].length

    multiplyMatrix.setOutput([width, height]);
    multiplyMatrix.setPipeline(false)
    return multiplyMatrix(matrix, multiplicant, summand)
  }

  function gpuMultiply(matrix, number){
    return gpuModify(matrix, number)
  }

  function gpuAdd(matrix, number){
    return gpuModify(matrix, 0, number)
  }
  
	function matrixSubset(matrix, x1, x2, y1, y2) {
    // slice + arrow functions are not allowed for gpu.js
    return matrix.slice(x1, x2).map(i => i.slice(y1, y2))
	}

  function matrixSum(matrix) {
    var total = 0;

    for(let y = 0; y < matrix.length; y++){
      for(let x = 0; x < matrix[y].length; x++){
        total += matrix[y][x];
      }
    }

    return total;
  }
  gpu.addFunction(matrixSum)

  function submatrixMean(matrix, startY, endY, startX, endX) {
    var total = 0;
    var count = 0;

    for(let y = startY; y < endY; y++){
      for(let x = startX; x < endX; x++){
        total += matrix[y][x];
        count++;
      }
    }

    return total / count;
  }
  gpu.addFunction(submatrixMean)

  const reduceMatrix = gpu.createKernel(function(matrix, factor) {
    return submatrixMean(matrix, this.thread.y*factor, ( this.thread.y+1) * factor,  this.thread.x*factor, ( this.thread.x+1)*factor)
  }, { dynamicOutput: true })

	function reduce(matrix, factor) {
		let width = Math.floor(matrix.length / factor);
		let height = Math.floor(matrix[0].length / factor);
    reduceMatrix.setOutput([width, height]);

    // Output is always typed (Float32Array) but must be Array for math.js
    // currently extremely cost intensive to transform the output
    // Todo get rid of this map by rewriting transpose below
    return reduceMatrix(matrix, factor).map((y) => Array.from(y))
	}

	function rotate(img, angle){
		// angle: 0, 90, 180, 270{
		const rotations = Math.floor(angle / 90)
		for(let i = 0; i < rotations; i++){
			img.reverse()
			img = transpose(img)
		}
		return img
	}

	function flip(matrix, direction){
		// direction: 1 or -1
		// only flip along the x axis if direction = -1
		if(direction == -1) {
			// Flip rows order
			matrix = matrix.reverse()
		}
		return matrix
	}

	document.addEventListener("DOMContentLoaded", convertImgToCanvas);

	onMount(() => {
	});
</script>

<main>
	<h1>Hackathon 2021</h1>

	<div>
		<h2>Source</h2>
		<img id="srcImage" src="images/monkey.gif" alt="" />
	</div>

	<div>
		<h2>Compress</h2>
		<canvas id="convertedImage" width="128" height="128" />
		<button on:click={handleCompress}> Compress </button>
	</div>

	<div>
		<h2>FIF</h2>
		<textarea id="userJSON" placeholder="Insert compressed image data">{fifData}</textarea>
	</div>

	<div>
		<h2>Decompress</h2>
		<canvas id="decompressedImage" width="128" height="128" />
		<button on:click={decompressUserJSON}> Decompress </button>
	</div>

  <div>
		<h2>Decompress dummy image</h2>
		<canvas id="decompressedMonkey" width="256" height="256" />
		<button on:click={decompressDummyImage}> Decompress monkey</button>
	</div>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>
