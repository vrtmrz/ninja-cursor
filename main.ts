import { App, Plugin } from "obsidian";


class NinjaCursorForWindow {

	lastPos: DOMRect | null = null;
	styleCount = 0;
	wrapperElement: HTMLDivElement | null;
	cursorElement: HTMLSpanElement;
	app: App;
	bufferedDocument: Document;
	bufferedWindow: Window;

	constructor(app: App, aw: Window, ad: Document, registerDomEvent: CallableFunction) {
		this.app = app;
		// buffering
		this.bufferedWindow = aw;
		this.bufferedDocument = ad;
		this.wrapperElement = ad.createElement("div");
		this.wrapperElement.addClass("cursorWrapper");
		this.cursorElement = ad.createElement("span");
		this.wrapperElement.appendChild(this.cursorElement);
		ad.body.appendChild(this.wrapperElement);
		this.cursorElement.addClass("x-cursor");
		const root = ad.documentElement;

		const moveCursor = () => {
			const selection = aw.getSelection();
			if (!selection) {
				console.log("Could not find selection");
				return;
			}
			if (selection.rangeCount == 0) return;
			const range = selection.getRangeAt(0);
			let rect = range?.getBoundingClientRect();
			if (!rect) {
				console.log("Could not find range");
				return;
			}
			if (rect.x == 0 && rect.y == 0) {
				const textRange = ad.createRange();
				textRange.setStart(range.startContainer, range.startOffset);
				textRange.setEndAfter(range.startContainer);
				let textRect = textRange.getBoundingClientRect();
				if (textRect.x == 0 && textRect.y == 0) {
					textRange.setStart(range.endContainer, range.endOffset - 1);
					textRange.setEnd(range.endContainer, range.endOffset);
					const textRectx = textRange.getClientRects();
					const txx = textRectx.item(textRectx.length - 1);
					if (!txx) {
						console.log("Could not found");
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
			if (this.lastPos == null) {
				this.lastPos = rect;
				return;
			}
			if (this.lastPos.x == rect.x && this.lastPos.y == rect.y) {
				return;
			}
			this.styleCount = (this.styleCount + 1) % 2;
			const dx = rect.x - this.lastPos.x;
			const dy = this.lastPos.y - rect.y;
			const cursorDragAngle = Math.atan2(dx, dy) + Math.PI / 2;
			const cursorDragDistance = Math.sqrt(dx * dx + dy * dy);

			const cursorDragHeight =
				Math.abs(Math.sin(cursorDragAngle)) * 8 +
				Math.abs(Math.cos(cursorDragAngle)) * rect.height;
			const cursorDragWidth = cursorDragDistance;
			root.style.setProperty(
				"--cursor-drag-height",
				`${cursorDragHeight}px`
			);
			root.style.setProperty(
				"--cursor-drag-width",
				`${cursorDragWidth}px`
			);
			root.style.setProperty(
				"--cursor-drag-angle",
				`${cursorDragAngle}rad`
			);
			root.style.setProperty("--cursor-height", `${rect.height}px`);
			root.style.setProperty("--cursor-x1", `${this.lastPos.x}px`);
			root.style.setProperty("--cursor-y1", `${this.lastPos.y}px`);
			root.style.setProperty("--cursor-x2", `${rect.x}px`);
			root.style.setProperty("--cursor-y2", `${rect.y}px`);
			this.cursorElement.removeClass("x-cursor0");
			this.cursorElement.removeClass("x-cursor1");
			this.cursorElement.getAnimations().forEach((anim) => anim.cancel());

			aw.requestAnimationFrame((time) => {
				this.cursorElement.addClass(`x-cursor${this.styleCount}`);
				this.lastPos = rect;
			});
		};


		registerDomEvent(aw, "keydown", () => {
			moveCursor();
		});
		registerDomEvent(aw, "keyup", () => {
			moveCursor();
		});
		registerDomEvent(aw, "mousedown", () => {
			moveCursor();
		});
		registerDomEvent(aw, "mouseup", () => {
			moveCursor();
		});
		registerDomEvent(aw, "touchend", () => {
			moveCursor();
		});
		registerDomEvent(aw, "touchstart", () => {
			moveCursor();
		});
	}

	unload() {
		if (this.wrapperElement) {
			const doc = this.wrapperElement.doc;
			if (doc) {
				doc.body.removeChild(this.wrapperElement);
				this.wrapperElement = null;
			}
		}
	}


}
export default class NinjaCursorPlugin extends Plugin {

	Cursors: NinjaCursorForWindow[] = [];

	async onload() {


		this.registerEvent(this.app.workspace.on("window-open", (win) => {
			console.log("Open by window-open")
			const exist = this.Cursors.find(e => e.bufferedWindow == win.win);
			if (!exist) {
				const w = new NinjaCursorForWindow(app, win.win, win.doc, this.registerDomEvent.bind(this));
				this.Cursors.push(w);
			}
		}));
		this.registerEvent(this.app.workspace.on("window-close", (win) => {
			const target = this.Cursors.find(e => e.bufferedWindow == win.win);
			if (target) {
				target.unload();
				this.Cursors.remove(target);
			}
		}));

		console.log("Open by init")
		const w = new NinjaCursorForWindow(app, window, document, this.registerDomEvent.bind(this));
		this.Cursors.push(w);
	}

	onunload() {
		for (const v of this.Cursors) {
			v.unload();
		}
	}

	async loadSettings() { }

	async saveSettings() { }
}
