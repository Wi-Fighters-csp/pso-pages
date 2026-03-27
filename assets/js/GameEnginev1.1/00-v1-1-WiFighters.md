---
layout: opencs
title: WiFighters Game
permalink: /gamify/wifightersv1-1
---

<div id="gameContainer">
    <div id="promptDropDown" class="promptDropDown" style="z-index: 9999"></div>
    <canvas id='gameCanvas'></canvas>
</div>

<script type="module">
    // Adventure Game asset locations
    import Core from "{{site.baseurl}}/assets/js/GameEnginev1.1/essentials/Game.js";
    import GameControl from "{{site.baseurl}}/assets/js/GameEnginev1.1/essentials/GameControl.js";
    import GameLevelWiFighters from "{{site.baseurl}}/assets/js/GameEnginev1.1/GameLevelWiFighters.js";
    import { pythonURI, javaURI, fetchOptions } from '{{site.baseurl}}/assets/js/api/config.js';

    const gameLevelClasses = [GameLevelWiFighters];

    // Web Server Environment data
    const environment = {
        path: "{{site.baseurl}}",
        pythonURI: pythonURI,
        javaURI: javaURI,
        fetchOptions: fetchOptions,
        gameContainer: document.getElementById("gameContainer"),
        gameCanvas: document.getElementById("gameCanvas"),
        gameLevelClasses: gameLevelClasses
    }

    // Launch WiFighters using the central core and GameControl
    Core.main(environment, GameControl);
</script>
