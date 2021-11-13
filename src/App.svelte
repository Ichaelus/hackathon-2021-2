<script>
	import { onMount } from 'svelte';
	import { multiply, add, zeros } from 'mathjs'

	function convertImgToCanvas() {
		const srcImage = document.getElementById("srcImage");

		srcImage.onload = function () {
			console.log("")
			const convertedImage = document.getElementById("convertedImage");
			const context = convertedImage.getContext("2d");

			context.drawImage(srcImage, 0, 0);
		};
	}

	function compress() {}

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
