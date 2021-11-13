<script>
	import { onMount } from 'svelte';
	import { multiply, add, xgcd, zeros, reshape, subtract, mean, index, subset, square } from 'mathjs'

	const directions = [1, -1]
	const angles = [0, 90, 180, 270]
	const candidates = [[1, 0], [1, 90], [1, 180], [1, 270], [-1, 0], [-1, 90], [-1, 180], [-1, 270]]

	function convertImgToCanvas() {
		const srcImage = document.getElementById("srcImage");

		srcImage.onload = function () {
			const convertedImage = document.getElementById("convertedImage");
			const context = convertedImage.getContext("2d");

			context.drawImage(srcImage, 0, 0);
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

    for (let k = 0; k < img.width - source_size; k += step) {
      for (let l = 0; l < img.height - source_size; l += step) {
        let SUnreduced = img.getImageData(k, l, source_size, source_size)
        let SGrayscaled = get_greyscale_image(SUnreduced)
		let S = reduce(SGrayscaled, factor)

		for (let [direction, angle] in candidates) {
	    	transformed_blocks.push((k, l, direction, angle, apply_transformation(S, direction, angle)))
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

//         debugger
//         array.push(MathJS.mean(r, g, b) * a)
//       }

//       matrix.push(array)
//     }

//     return matrix
//   }

  function get_greyscale_image(img) {
    let rgbaSize = 4
    let imgData = new Uint8ClampedArray(img.data.length / rgbaSize)

    for(let i = 0; i < img.data.length; i += rgbaSize) {
      let [r, g, b, a] = img.data.slice(i, rgbaSize)
      // 255 red, 80 green, 22 blue, a = 0.2 => 119 * 0.2
      imgData[i] = mean(r, g, b) * a
    }

    return reshape(imgData, img.height())
  }

  function find_contrast_and_brightness(D, S) {
    let contrast = 0.75

    // D[1, 2, 5, 4] - 0.75 * D[4, 1, 3, 7]
    let brightness = sum(subtract(D, multiply(contrast, S))) / D.length
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

	function compress(canvas, source_size, destination_size, step) {
    let img = canvas.getContext('2d')
    // let img = context.getImageData(0, 0, context.width, context.height)

    let transformations = []
    let transformed_blocks = generate_all_transformed_blocks(img, source_size, destination_size, step)
    let i_count = Math.floor(img.width / destination_size)
    let j_count = Math.floor(img.height / destination_size)

    for (let i = 0; i < i_count; i++) {
      transformations.push([]);
      for (let j = 0; j < j_count; j++) {
        transformations[i].push([])
        let min_d = Infinity
        // Extract the destination block

        let DColored = img.getImageData(i * destination_size, j * destination_size, destination_size, destination_size)
        let D = get_greyscale_image(DColored)

        // Test all possible transformations and take the best one
        for (let [k, l, direction, angle, S] of transformed_blocks) {
          let [contrast, brightness] = find_contrast_and_brightness(D, S)
          S = add(multiply(contrast, S), brightness)
          let d = sum(square(subtract(D, S)))

          if (d < min_d) {
            min_d = d
            transformations[i][j] = [k, l, direction, angle, contrast, brightness]
          }
        }
      }
    }

    return transformations
  }

	function decompress(transformations, source_size, destination_size, step, interations=8){
	  // transformations: Matrix with transformation metadata at each point (x, y)
	  // source_size: width and height of the uncompressed image
    // destination_size: compressed image dimensions
		// step: minimum x/y translation of the transformation slices
		// interations: decompression steps, higher is better (and slower)
  	const factor = Math.floor(source_size / destination_size)
    const height = transformations.length * destination_size
    const width = transformations[0].length * destination_size
    let decompressedImages = []
		for(let iteration = 0; i < iterations; i++){
			console.log(`Starting iteration: ${iteration}`)
      let currentImage = zeros(height, width)
			for(let y = 0; y < transformations.length; y++){
				for(let x = 0; x < transformations[x].length; x++){
       		// Apply transformation
					const [k, l, flip, angle, contrast, brightness] = transformations[y][x]
       		//S = reduce(iterations[-1][k*step:k*step+source_size,l*step:l*step+source_size], factor)
       		//D = apply_transformation(S, flip, angle, contrast, brightness)
					//currentImage[i*destination_size:(i+1)*destination_size,j*destination_size:(j+1)*destination_size] = D
				}
			}
      decompressedImages.append(currentImage)
		}
		return decompressedImages
	}
	
	function apply_transformation(img, direction, angle, contrast = 1.0, brightness = 0.0){
		// img: matrix
		// direction: 1 or -1
		// angle: 0, 90, 180, 270
		const imageClone = img // flip and rotate operate in place
		return add(multiply(rotate(flip(imgClone, direction), angle), contrast), brightness)
	}

	function matrixSubset(matrix, x1, x2, y1, y2) {
    	return matrix.slice(x1, x2).map(i => i.slice(y1, y2))
	}

	function reduce(matrix, factor) {
		let width = Math.floor(matrix.length / factor);
		let height = Math.floor(matrix[0].length / factor);
		let c = zeros(width, height)._data;

		for(let x=0;x<width;x++){
			for(let y=0;y<width;y++){
				c[x][y] = mean(matrixSubset(matrix, x*factor, (x+1) * factor, y*factor, (y+1)*factor));
			}
		}
		return c;

	}

	function rotate(img, angle){
		// angle: 0, 90, 180, 270{
		const rotations = Math.floor(angle / 90)
		for(let i = 0; i < rotations; i++){
			img.reverse()
			img = math.transpose(img)
		}
		return img
	}

	function flip(img, direction){
		// direction: 1 or -1
		// only flip along the x axis if direction = -1
		if(direction == -1) {
			// Flip rows order
			img = img.reverse()
		}
		return img
	}

	document.addEventListener("DOMContentLoaded", convertImgToCanvas);

	debugger
	let fifPlaceholder = {
		source_size: 8,
	};

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
		<canvas id="convertedImage" width="256" height="256" />
		<button on:click={compress}> Compress </button>
	</div>

	<div>
		<h2>FIF</h2>
		<textarea placeholder="Insert compressed image data">{fifPlaceholder}</textarea>
	</div>

	<div>
		<h2>Decompress</h2>
		<canvas id="decompressedImage" width="256" height="256" />
		<button on:click={decompress}> Decompress </button>
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
