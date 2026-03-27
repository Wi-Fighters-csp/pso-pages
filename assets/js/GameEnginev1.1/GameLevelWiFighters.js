import GameEnvBackground from './essentials/GameEnvBackground.js';
import Npc from './essentials/Npc.js';
import Player from './essentials/Player.js';

class GameLevelWiFighters {
	constructor(gameEnv) {
		const width = gameEnv.innerWidth;
		const height = gameEnv.innerHeight;
		const path = gameEnv.path;

		const image_data_water = {
			id: 'WiFightersWater',
			src: path + '/images/gamify/water/deepseadungeon.jpeg',
			pixels: { height: 597, width: 340 }
		};

		const sprite_data_octopus = {
			id: 'Octopus',
			name: 'player',
			greeting: 'I am Octopus, ready for a WiFighters water run.',
			src: path + '/images/gamify/water/octopus.png',
			SCALE_FACTOR: 5,
			STEP_FACTOR: 1000,
			ANIMATION_RATE: 50,
			GRAVITY: true,
			INIT_POSITION: { x: width * 0.08, y: height - height / 5 },
			pixels: { height: 250, width: 167 },
			orientation: { rows: 3, columns: 2 },
			down: { row: 0, start: 0, columns: 2 },
			downLeft: { row: 0, start: 0, columns: 2, mirror: true, rotate: Math.PI / 16 },
			downRight: { row: 0, start: 0, columns: 2, rotate: -Math.PI / 16 },
			left: { row: 1, start: 0, columns: 2, mirror: true },
			right: { row: 1, start: 0, columns: 2 },
			up: { row: 0, start: 0, columns: 2 },
			upLeft: { row: 1, start: 0, columns: 2, mirror: true, rotate: -Math.PI / 16 },
			upRight: { row: 1, start: 0, columns: 2, rotate: Math.PI / 16 },
			hitbox: { widthPercentage: 0.45, heightPercentage: 0.2 },
			keypress: { up: 87, left: 65, down: 83, right: 68 }
		};

		const sprite_data_villager = {
			id: 'Villager',
			greeting: 'Welcome to WiFighters water. Keep moving and explore.',
			src: path + '/images/gamify/villager.png',
			SCALE_FACTOR: 6,
			ANIMATION_RATE: 100,
			pixels: { width: 700, height: 1400 },
			INIT_POSITION: { x: width * 0.72, y: height * 0.2 },
			orientation: { rows: 1, columns: 1 },
			down: { row: 0, start: 0, columns: 1 },
			hitbox: { widthPercentage: 0.1, heightPercentage: 0.2 },
			dialogues: [
				'This arena uses the water backdrop from the original level.',
				'The octopus player replaces Chill Guy here.',
				'Try pressing E while standing near me.'
			],
			reaction: function() {
				if (this.dialogueSystem) {
					this.showReactionDialogue();
				}
			},
			interact: function() {
				if (this.dialogueSystem) {
					this.showRandomDialogue();
				}
			}
		};

		this.classes = [
			{ class: GameEnvBackground, data: image_data_water },
			{ class: Player, data: sprite_data_octopus },
			{ class: Npc, data: sprite_data_villager }
		];
	}
}

export default GameLevelWiFighters;
