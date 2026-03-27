import GameEnvBackground from './essentials/GameEnvBackground.js';
import AiNpc from './essentials/AiNpc.js';
import Npc from './essentials/Npc.js';
import Player from './essentials/Player.js';

function clearDialogueButtons(dialogueSystem) {
	if (!dialogueSystem?.dialogueBox) return;
	const buttonContainers = dialogueSystem.dialogueBox.querySelectorAll('div[style*="display: flex"]');
	buttonContainers.forEach(container => {
		if (container.contains(document.getElementById('dialogue-avatar-' + dialogueSystem.safeId))) {
			return;
		}
		container.remove();
	});
}

class GameLevelWiFighters {
	constructor(gameEnv) {
		const width = gameEnv.innerWidth;
		const height = gameEnv.innerHeight;
		const path = gameEnv.path;

		const image_data_arena = {
			id: 'WiFightersArena',
			src: path + '/images/gamify/wild.png',
			pixels: { height: 1440, width: 2560 }
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
			id: 'NetworkingDoggy',
			greeting: 'Networking check: fetch starts at the application layer, then rides TCP and IP to the server.',
			src: path + '/images/gamify/doggy.png',
			SCALE_FACTOR: 6,
			ANIMATION_RATE: 10,
			pixels: { height: 2997, width: 2313 },
			sourceOffsetY: -24,
			INIT_POSITION: { x: width * 0.84, y: height * 0.22 },
			orientation: { rows: 4, columns: 3 },
			down: { row: 1, start: 0, columns: 3 },
			up: { row: 3, start: 0, columns: 3 },
			left: { row: 0, start: 0, columns: 3 },
			right: { row: 2, start: 0, columns: 3 },
			upLeft: { row: 0, start: 0, columns: 3 },
			upRight: { row: 2, start: 0, columns: 3 },
			downLeft: { row: 0, start: 0, columns: 3 },
			downRight: { row: 2, start: 0, columns: 3 },
			hitbox: { widthPercentage: 0.1, heightPercentage: 0.2 },
			quizQuestions: [
				{
					question: '1. Which layer in the TCP/IP model is responsible for HTTP and DNS?',
					options: ['Application', 'Transport', 'Network', 'Data Link'],
					correctIndex: 0,
					explanation: 'HTTP and DNS both live at the application layer.'
				},
				{
					question: '2. Which protocol gives reliable, ordered delivery for web traffic?',
					options: ['UDP', 'TCP', 'IP', 'ARP'],
					correctIndex: 1,
					explanation: 'TCP handles ordered delivery, retransmission, and connection management.'
				},
				{
					question: '3. What does DNS do before a browser reaches your backend?',
					options: ['Encrypts the packet', 'Resolves a domain to an IP address', 'Builds the Ethernet frame', 'Stores cookies'],
					correctIndex: 1,
					explanation: 'DNS translates a domain name into the destination IP address.'
				},
				{
					question: '4. In your deployment, what is nginx mainly doing?',
					options: ['Serving as a reverse proxy', 'Replacing DNS', 'Acting as a database', 'Compiling JavaScript'],
					correctIndex: 0,
					explanation: 'Nginx receives outside traffic and forwards it to the correct backend service.'
				},
				{
					question: '5. Which OSI layers are usually folded into the TCP/IP application layer?',
					options: ['Physical and data link', 'Network and transport', 'Session and presentation', 'Transport and session'],
					correctIndex: 2,
					explanation: 'TCP/IP usually combines OSI session and presentation into the application layer.'
				},
				{
					question: '6. A common Ethernet MTU is:',
					options: ['128 bytes', '512 bytes', '1500 bytes', '4096 bytes'],
					correctIndex: 2,
					explanation: 'A standard Ethernet MTU is commonly 1500 bytes.'
				},
				{
					question: '7. Which layer adds source and destination IP addresses?',
					options: ['Application', 'Transport', 'Network', 'Physical'],
					correctIndex: 2,
					explanation: 'The network layer adds IP addressing for routing across networks.'
				},
				{
					question: '8. HTTPS mainly adds which security feature?',
					options: ['Routing tables', 'TLS encryption', 'MAC addressing', 'Packet fragmentation'],
					correctIndex: 1,
					explanation: 'HTTPS uses TLS to encrypt traffic between client and server.'
				},
				{
					question: '9. In the request path, which comes first?',
					options: ['IP packet creation', 'Browser creates HTTP request data', 'Ethernet frame delivery', 'Server response rendering'],
					correctIndex: 1,
					explanation: 'The browser creates the application-layer HTTP request before lower layers encapsulate it.'
				},
				{
					question: '10. Why is a reverse proxy useful for your project deployment?',
					options: ['It replaces JavaScript fetch', 'It lets users access internal app ports directly', 'It hides internal services behind standard web ports and can manage TLS', 'It removes the need for DNS'],
					correctIndex: 2,
					explanation: 'A reverse proxy exposes clean public ports and can handle TLS while keeping internal services hidden.'
				}
			],
			reaction: function() {
				if (this.dialogueSystem) {
					this.showReactionDialogue();
				}
			},
			interact: function() {
				if (!this.dialogueSystem) return;

				const askQuestion = (questionIndex, score) => {
					const quiz = this.spriteData.quizQuestions || [];
					if (questionIndex >= quiz.length) {
						clearDialogueButtons(this.dialogueSystem);
						this.dialogueSystem.showDialogue(
							`Quiz complete. You scored ${score} out of ${quiz.length} on networking.`,
							this.spriteData.id,
							this.spriteData.src,
							this.spriteData
						);
						this.dialogueSystem.addButtons([
							{
								text: 'Restart Quiz',
								action: () => askQuestion(0, 0)
							}
						]);
						return;
					}

					const currentQuestion = quiz[questionIndex];
					clearDialogueButtons(this.dialogueSystem);
					this.dialogueSystem.showDialogue(
						currentQuestion.question,
						this.spriteData.id,
						this.spriteData.src,
						this.spriteData
					);

					this.dialogueSystem.addButtons(
						currentQuestion.options.map((option, optionIndex) => ({
							text: option,
							action: () => {
								const isCorrect = optionIndex === currentQuestion.correctIndex;
								const nextScore = isCorrect ? score + 1 : score;
								clearDialogueButtons(this.dialogueSystem);
								this.dialogueSystem.showDialogue(
									`${isCorrect ? 'Correct.' : 'Not quite.'} ${currentQuestion.explanation}`,
									this.spriteData.id,
									this.spriteData.src,
									this.spriteData
								);
								this.dialogueSystem.addButtons([
									{
										text: questionIndex === quiz.length - 1 ? 'See Score' : 'Next Question',
										action: () => askQuestion(questionIndex + 1, nextScore)
									}
								]);
							}
						}))
					);
				};

				askQuestion(0, 0);
			}
		};

		const sprite_data_network_coach = {
			id: 'NetworkCoach',
			greeting: 'Ask me about the network stack, reverse proxies, or MTU sizing in your project deployment.',
			src: path + '/images/gamify/kittyy.png',
			SCALE_FACTOR: 8,
			ANIMATION_RATE: 12,
			pixels: { width: 128, height: 256 },
			INIT_POSITION: { x: width * 0.12, y: height * 0.1 },
			orientation: { rows: 8, columns: 4 },
			down: { row: 2, start: 0, columns: 4 },
			up: { row: 7, start: 0, columns: 4 },
			left: { row: 1, start: 0, columns: 4 },
			right: { row: 3, start: 0, columns: 4 },
			downLeft: { row: 1, start: 0, columns: 4 },
			downRight: { row: 3, start: 0, columns: 4 },
			upLeft: { row: 6, start: 0, columns: 4 },
			upRight: { row: 6, start: 0, columns: 4, mirror: true },
			walkingArea: {
				xMin: width * 0.02,
				xMax: width * 0.42,
				yMin: height * 0.03,
				yMax: height * 0.42
			},
			speed: 2.4,
			moveDirection: { x: 1, y: 0.9 },
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
