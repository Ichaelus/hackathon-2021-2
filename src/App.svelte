<script>
	import { onMount } from 'svelte'
	import { zeros, reshape, mean } from 'mathjs'
	import { GPU } from 'gpu.js'
  import { LeastSquares } from './least-squares'
  
  const gpu = new GPU({
    // mode: 'dev', 'webgl', 'webgl2', 'headlessgl', 'cpu'
    mode: 'dev' // idk why but dev and cpu are the fastest on my machine
  })

  let fifData = localStorage.getItem('lastCompressedJSON')

	function handleCompress() {
		const convertedImage = document.getElementById("convertedImage")
		const transformations = compress(convertedImage, 8, 4, 8)
    const json = {
      "source_size": 8,
      "destination_size": 4,
      "step": 8,
      "transformations": transformations
    }

    fifData = JSON.stringify(json)
    localStorage.setItem('lastCompressedJSON', fifData)
	}

	// const directions = [1, -1]
	// const angles = [90, 180, 270, 0]
	const candidates = [
    [1, 0], [1, 90], [1, 180], [1, 270],
    [-1, 0], [-1, 90], [-1, 180], [-1, 270]
  ]

	function convertImgToCanvas() {
		const srcImage = document.getElementById("srcImage")

		srcImage.onload = function () {
			const convertedImage = document.getElementById("convertedImage")
			const context = convertedImage.getContext("2d")

			context.drawImage(srcImage, 0, 0, 128, 128)
		}
	}

  function generate_all_transformed_blocks(img, source_size, destination_size, step) {
    const factor = Math.floor(source_size / destination_size)
    let transformed_blocks = []

    for (let y = 0; y < img.canvas.height - source_size; y += step) {
      for (let x = 0; x < img.canvas.width - source_size; x += step) {
        const SUnreduced = img.getImageData(x, y, source_size, source_size)
        const SGrayscaled = getGrayscale(SUnreduced)
		    const S = reduce(SGrayscaled, factor)
        for (let [direction, angle] of candidates) {
          transformed_blocks.push([y/8, x/8, direction, angle, apply_transformation(S, direction, angle)])
        }
      }
    }

	  return transformed_blocks
  }

  
  function getGrayscale(img) {
    const rgbaSize = 4
    let ctr = 0
    let imgData = []
    for(let i = 0; i < img.data.length; i += rgbaSize, ctr++) {
      let [r, g, b, a] = img.data.slice(i, i+rgbaSize)
      if (r === g && g == b) {
        imgData[ctr] = r // already grayscale pixel
      } else {
        // https://people.math.sc.edu/Burkardt/m_src/image_rgb_to_gray/image_rgb_to_gray.html
        imgData[ctr] = parseInt(0.2126 * r + 0.7152 * g + 0.0722 * b * (a / 255))
      }
    }
    return reshape(imgData, [img.height, img.width])
  }

  // Todo: The output does not match the non-GPU method yet
  // const grayscaleMatrix = gpu.createKernel(function(matrix, rgbaData) {
  //   const rgbaSize = 4
  //   const i = (this.thread.x * matrix.height + this.thread.y * matrix.width) * rgbaSize
  //   const [r, g, b, _a] = rgbaData.slice(i, i + rgbaSize)
  //   // return mean(r, g, b)// * a
  //   // https://people.math.sc.edu/Burkardt/m_src/image_rgb_to_gray/image_rgb_to_gray.html
  //   return parseInt(0.2126 * r + 0.7152 * g + 0.0722 * b)
  // }, { dynamicOutput: true })

  // function getGrayscale(img) {
  //   grayscaleMatrix.setOutput([img.height, img.width])
  //   return grayscaleMatrix(img, img.data)
  // }

  function findContrastAndBrightness(matrix, otherMatrix) {
    let squaresResults = {}
    const singleDimensionMatrix = reshape(matrix, [matrix.length * matrix[0].length])
    const mathjscompatible = otherMatrix.map(row => Array.from(row))
    const singleDimensionOtherMatrix = reshape(mathjscompatible, [otherMatrix.length * otherMatrix[0].length])
    LeastSquares(singleDimensionMatrix, singleDimensionOtherMatrix, squaresResults)
    let brightness = squaresResults.b
    let contrast = squaresResults.m
    return [contrast, brightness]
  }
  
  const gpuSquareSubstracted = gpu.createKernel(function(matrix, otherMatrix) {
    const substracted = matrix[this.thread.y][this.thread.x] - otherMatrix[this.thread.y][this.thread.x]
    return substracted * substracted
  }, { dynamicOutput: true })

	function compress(canvas, source_size, destination_size, step) {
    const img = canvas.getContext('2d')
    // let img = context.getImageData(0, 0, context.width, context.height)

    let transformations = []
    const transformed_blocks = generate_all_transformed_blocks(img, source_size, destination_size, step)
    const y_count = Math.floor(img.canvas.height / destination_size)
    const x_count = Math.floor(img.canvas.width / destination_size)

    for (let y = 0; y < y_count; y++) {
      transformations.push([])
      for (let x = 0; x < x_count; x++) {
        console.log(`New block ${y} ${x}`)
        transformations[y].push([])
        let minimumDelta = Infinity
        // Extract the destination block

        const DColored = img.getImageData(x * destination_size, y * destination_size, destination_size, destination_size)
        const D = getGrayscale(DColored)
        // Test all possible transformations and take the best one
        for (let [k, l, direction, angle, S] of transformed_blocks) {
          const [contrast, brightness] = findContrastAndBrightness(D, S)

          multiplyMatrix.setOutput([destination_size, destination_size])
          gpuSquareSubstracted.setOutput([destination_size, destination_size])
          
          multiplyMatrix.setPipeline(true)
          S = multiplyMatrix(S, contrast, brightness)
          const delta = matrixSum(gpuSquareSubstracted(D, S))
          if (delta < minimumDelta) {
            minimumDelta = delta
            transformations[y][x] = [k, l, direction, angle, contrast, brightness]
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

    multiplyMatrix.setOutput([width, height])
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
    let total = 0

    for(let y = 0; y < matrix.length; y++){
      for(let x = 0; x < matrix[y].length; x++){
        total += matrix[y][x]
      }
    }

    return total
  }
  gpu.addFunction(matrixSum)

  function submatrixMean(matrix, startY, endY, startX, endX) {
    let total = 0
    let count = 0

    for(let y = startY; y < endY; y++){
      for(let x = startX; x < endX; x++){
        total += matrix[y][x]
        count++
      }
    }

    return total / count
  }
  gpu.addFunction(submatrixMean)

  const gpuReduceMatrix = gpu.createKernel(function(matrix, factor) {
    return submatrixMean(matrix, this.thread.y*factor, ( this.thread.y+1) * factor,  this.thread.x*factor, ( this.thread.x+1)*factor)
  }, { dynamicOutput: true })

	function reduce(matrix, factor) {
		const width = Math.floor(matrix.length / factor)
		const height = Math.floor(matrix[0].length / factor)
    gpuReduceMatrix.setOutput([width, height])

    // Output is always typed (Float32Array) but must be Array for math.js
    // currently extremely cost intensive to transform the output
    // Todo get rid of this map by rewriting transpose below
    return gpuReduceMatrix(matrix, factor)
	}

	function rotate(img, angle){
		// angle: 0, 90, 180, 270{
		const rotations = Math.floor(angle / 90)
		for(let i = 0; i < rotations; i++){
			img.reverse()
      gpuTranspose.setOutput([img[0].length, img.length])
			img = gpuTranspose(img)
		}
		return img
	}

  const gpuTranspose = gpu.createKernel(function(matrix) {
    return matrix[this.thread.x][this.thread.y] // transpose: switch x and y
  }, { dynamicOutput: true })

	function flip(matrix, direction){
		// direction: 1 or -1
		// only flip along the x axis if direction = -1
		if(direction == -1) {
			// Flip rows order
			matrix = matrix.reverse()
		}
		return matrix
	}

	document.addEventListener("DOMContentLoaded", convertImgToCanvas)

	onMount(() => {
	})
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
