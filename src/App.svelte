<script>
	function convertImgToCanvas(){
		const srcImage = document.getElementById("srcImage");

		srcImage.onload = function() {
      const convertedImage = document.getElementById("convertedImage");
      const context = convertedImage.getContext('2d');

      context.drawImage(srcImage, 0, 0);
    };
	}

  document.addEventListener("DOMContentLoaded", convertImgToCanvas);
</script>

<main>
	<h1>Hackathon 2021</h1>
	<img id="srcImage" src="images/monkey.gif" alt="">
	<canvas id="convertedImage" width="256" height="256"></canvas>
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