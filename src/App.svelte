<script>
	function convertImgToCanvas(){
		var myImgElement = document.getElementById("srcimage");
		var myCanvasElement = document.getElementById("convertedimage");
		//myCanvasElement.width = myImgElement.width;
		//myCanvasElement.height = myImgElement.height;
		var context = myCanvasElement.getContext('2d');
		context.drawImage(myImgElement,0,0);
		console.log("test");  
	}

	document.addEventListener('DOMContentLoaded', convertImgToCanvas);
</script>

<main>
	<h1>Hackathon 2021</h1>
	<button on:click={convertImgToCanvas}>
		 Load
	</button>
	<img id="srcimage" src="images/monkey.gif" alt="">
	<canvas id="convertedimage" width="256" height="256"></canvas>
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