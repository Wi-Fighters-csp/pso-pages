import GameEnvBackground from './essentials/GameEnvBackground.js';
import AiNpc from './essentials/AiNpc.js';
import Npc from './essentials/Npc.js';
import Player from './essentials/Player.js';

class GameLevelWiFighters {
	constructor(gameEnv) {
		const width = gameEnv.innerWidth;
		const height = gameEnv.innerHeight;
		const path = gameEnv.path;

		const image_data_arena = {
			id: 'WiFightersArena',
			src: path + '/images/gamify/retrocity.jpg',
			pixels: { height: 736, width: 1308 }
		};

		const sprite_data_octopus = {
			id: 'Guy',
			name: 'player',
			greeting: 'I am ready for a WiFighters run.',
			src: path + '/images/gamify/guy.png',
			SCALE_FACTOR: 5,
			STEP_FACTOR: 1000,
			ANIMATION_RATE: 50,
			GRAVITY: false,
			INIT_POSITION: { x: width * 0.08, y: height - height / 5 },
			pixels: { height: 611, width: 408 },
			orientation: { rows: 4, columns: 4 },
			down: { row: 0, start: 0, columns: 4 },
			downLeft: { row: 2, start: 0, columns: 4 },
			downRight: { row: 3, start: 0, columns: 4 },
			left: { row: 2, start: 0, columns: 4 },
			right: { row: 3, start: 0, columns: 4 },
			up: { row: 1, start: 0, columns: 4 },
			upLeft: { row: 2, start: 0, columns: 4 },
			upRight: { row: 3, start: 0, columns: 4 },
			hitbox: { widthPercentage: 0.45, heightPercentage: 0.2 },
			keypress: { up: 87, left: 65, down: 83, right: 68 }
		};

		const sprite_data_wizard = {
			id: 'ArenaWizard',
			greeting: 'Networking check: fetch starts at the application layer, then rides TCP and IP to the server.',
			src: path + '/images/gamify/wizard.png',
			SCALE_FACTOR: 5,
			ANIMATION_RATE: 50,
			pixels: { width: 185, height: 163 },
			INIT_POSITION: { x: width * 0.72, y: height * 0.22 },
			orientation: { rows: 1, columns: 1 },
			down: { row: 0, start: 0, columns: 1 },
			hitbox: { widthPercentage: 0.1, heightPercentage: 0.2 },
			dialogues: [
				'DNS resolves the backend domain name to an IP address before the request can travel.',
				'HTTP lives at the application layer, but reliable delivery happens through TCP at the transport layer.',
				'Nginx acts as a reverse proxy: it receives traffic on ports 80 or 443 and forwards it to the backend app.',
				'If the app uses HTTPS, SSL and TLS protect the data before it moves across the network.',
				'Your browser sends a request down the stack, and the server response climbs back up the stack in reverse.'
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

		const sprite_data_network_coach = {
			id: 'NetworkCoach',
			greeting: 'Ask me about the network stack, reverse proxies, or MTU sizing in your project deployment.',
			src: path + '/images/gamify/historyProf.png',
			SCALE_FACTOR: 5,
			ANIMATION_RATE: 10,
			pixels: { height: 263, width: 559 },
			INIT_POSITION: { x: width * 0.48, y: height * 0.22 },
			orientation: { rows: 4, columns: 9 },
			down: { row: 3, start: 0, columns: 9 },
			up: { row: 3, start: 0, columns: 9 },
			left: { row: 3, start: 0, columns: 9 },
			right: { row: 3, start: 0, columns: 9 },
			downLeft: { row: 3, start: 0, columns: 9 },
			downRight: { row: 3, start: 0, columns: 9 },
			upLeft: { row: 3, start: 0, columns: 9 },
			upRight: { row: 3, start: 0, columns: 9 },
			hitbox: { widthPercentage: 0.2, heightPercentage: 0.3 },
			expertise: 'networking',
			chatHistory: [],
			dialogues: [
				'Pop quiz warmup: explain how your browser reaches your backend.',
				'Need help with TCP/IP versus OSI? Ask here.',
				'Want to connect MTU size to packet formation? I can walk through it.',
				'Use your actual deployment: GitHub Pages frontend, AWS EC2 backend, nginx reverse proxy.'
			],
			knowledgeBase: {
				networking: [
					{
						question: 'How does our deployed project connect the frontend to the backend?',
						answer: 'The frontend is hosted on GitHub Pages and sends fetch requests over HTTPS to a backend running on AWS EC2. DNS resolves the backend domain, TCP creates the connection, nginx receives traffic on ports 80 or 443, and then proxies the request to the backend container or application.'
					},
					{
						question: 'What is the difference between the TCP/IP 5-layer model and the OSI 7-layer model?',
						answer: 'The OSI model is a conceptual 7-layer guide: physical, data link, network, transport, session, presentation, and application. The TCP/IP model is the more practical internet model, often shown with 5 layers: physical, data link, network, transport, and application. In TCP/IP, session and presentation are usually folded into the application layer.'
					},
					{
						question: 'How should I explain MTU in this game challenge?',
						answer: 'MTU is the maximum transmission unit. On Ethernet, a common MTU is 1500 bytes, so the payload must fit within that size after headers are added. Application data is wrapped by a TCP header, then an IP header, then placed into an Ethernet frame with its own header and trailer.'
					},
					{
						question: 'What does nginx do in our deployment?',
						answer: 'Nginx acts as a reverse proxy. It accepts incoming HTTP or HTTPS traffic from the internet, can terminate TLS, apply routing rules, and forward the request to the correct backend process or container running on an internal port.'
					},
					{
						question: 'How does a request move through the layers?',
						answer: 'A browser creates HTTP data at the application layer. TCP adds transport information, IP adds source and destination addressing, the data link layer builds a frame, and the physical layer sends signals. On the server side, the process is reversed until the application can handle the request.'
					}
				]
			},
			reaction: function() {
				if (this.dialogueSystem) {
					this.showReactionDialogue();
				}
			},
			interact: function() {
				AiNpc.showInteraction(this);
			}
		};

		this.classes = [
			{ class: GameEnvBackground, data: image_data_arena },
			{ class: Player, data: sprite_data_octopus },
			{ class: Npc, data: sprite_data_wizard },
			{ class: Npc, data: sprite_data_network_coach }
		];
	}
}

export default GameLevelWiFighters;
