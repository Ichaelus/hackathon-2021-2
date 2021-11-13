<script>
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

	function decompress() {}

	document.addEventListener("DOMContentLoaded", convertImgToCanvas);
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
		<textarea placeholder="Insert compressed image data"></textarea>
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
