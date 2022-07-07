import { Plugin } from 'obsidian';


let lastPos: DOMRect | null = null;
let styleCount = 0;
export default class NinjaCursorPlugin extends Plugin {
	cursorElement: HTMLSpanElement;

	async onload() {
		this.cursorElement = document.createElement("span");

		document.body.appendChild(this.cursorElement);
		const root = document.documentElement;
		root.style.setProperty("--cursor-x1", `${0}`);
		root.style.setProperty("--cursor-y1", `${0}`);
		root.style.setProperty("--cursor-x2", `${0}`);
		root.style.setProperty("--cursor-y2", `${0}`);
		this.cursorElement.addClass("x-cursor");

		const moveCursor = () => {
			const selection = window.getSelection();
			if (!selection) {
				console.log("Could not find selection")
				return;
			}
			const range = selection.getRangeAt(0);
			let rect = range?.getBoundingClientRect()
			if (!rect) {
				console.log("Could not find range")
				return;
			}
			if (rect.x == 0 && rect.y == 0) {
				const textRange = document.createRange()
				textRange.setStart(range.startContainer, range.startOffset)
				textRange.setEndAfter(range.startContainer)
				let textRect = textRange.getBoundingClientRect()
				if (textRect.x == 0 && textRect.y == 0) {
					textRange.setStart(range.endContainer, range.endOffset - 1)
					textRange.setEnd(range.endContainer, range.endOffset)
					const textRectx = textRange.getClientRects();
					const txx = textRectx.item(textRectx.length - 1);
					if (!txx) {
						console.log("Could not found")
						return;
					}
					textRect = txx;
					textRect.x = txx.right;
					textRect.y = txx.bottom - txx.height;
				}

				if (textRect.x == 0 && textRect.y == 0) {
					return;
				}
				rect = textRect;
			}
			if (lastPos == null) {
				lastPos = rect;
				return;
			}
			if (lastPos.x == rect.x && lastPos.y == rect.y) {
				return;
			}
			styleCount = (styleCount + 1) % 2;
			root.style.setProperty("--cursor-height", `${rect.height}px`);
			root.style.setProperty("--cursor-x1", `${lastPos.x}px`);
			root.style.setProperty("--cursor-y1", `${lastPos.y}px`);
			root.style.setProperty("--cursor-x2", `${rect.x}px`);
			root.style.setProperty("--cursor-y2", `${rect.y}px`);
			this.cursorElement.removeClass("x-cursor0");
			this.cursorElement.removeClass("x-cursor1");
			this.cursorElement.getAnimations().forEach((anim) => anim.cancel());

			window.requestAnimationFrame((time) => {
				window.requestAnimationFrame((time) => {
					this.cursorElement.addClass(`x-cursor${styleCount}`);
					lastPos = rect;
				})
			})
		}
		this.registerDomEvent(window, "keydown", (ev) => {
			moveCursor();

		})
		this.registerDomEvent(window, "mousedown", () => {
			moveCursor();
		})
	}


	onunload() {
		document.body.removeChild(this.cursorElement);
	}

	async loadSettings() {

	}

	async saveSettings() {

	}
}
