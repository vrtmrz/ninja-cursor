import { App, Plugin } from "obsidian";

function waitForReflowComplete() {
	return new Promise((res) => {
		window.requestAnimationFrame(() => res(true));
	})
}

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
		const styleRoot = this.wrapperElement;
		let datumTop = 0;
		let datumElement: HTMLElement;
		let cursorVisibility = false;
		let processing = false;
		const moveCursor = async (e?: Event, noAnimate?: boolean) => {
			if (processing) {
				return;
			}
			processing = true;
			await __moveCursor(e, noAnimate);
			processing = false;
		}
		const __moveCursor = async (e?: Event, noAnimate?: boolean) => {
			if (e && e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.tagName == "INPUT")) {
				// If it caused by clicking an element and it is editable.
				datumElement = e.target;
				if (!cursorVisibility) {
					styleRoot.style.setProperty("--cursor-visibility", `visible`);
					cursorVisibility = true;
				}
			} else if (e != null) {
				// If it caused by clicking an element but it is not editable.
				if (cursorVisibility) {
					styleRoot.style.setProperty("--cursor-visibility", `hidden`);
					cursorVisibility = false;
				}
				return;
			}
			if (e && e.target instanceof HTMLElement) {
				// Memo datum element for scroll.
				datumElement = e.target;
			}
			await waitForReflowComplete();
			datumTop = datumElement.getBoundingClientRect().top;
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
					const startEndOffset = range.endOffset - 1 < 0 ? 0 : range.endOffset - 1;
					textRange.setStart(range.endContainer, startEndOffset);
					textRange.setEnd(range.endContainer, range.endOffset);
					const textRects = textRange.getClientRects();
					const tempRect = textRects.item(textRects.length - 1);
					if (!tempRect) {
						console.log("Could not found");
						return;
					}
					textRect = tempRect;
					textRect.x = tempRect.right;
					textRect.y = tempRect.bottom - tempRect.height;
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

			styleRoot.style.setProperty(
				"--cursor-drag-height",
				`${cursorDragHeight}px`
			);
			styleRoot.style.setProperty(
				"--cursor-drag-width",
				`${cursorDragWidth}px`
			);
			styleRoot.style.setProperty(
				"--cursor-drag-angle",
				`${cursorDragAngle}rad`
			);
			styleRoot.style.setProperty("--cursor-height", `${rect.height}px`);
			styleRoot.style.setProperty("--cursor-x1", `${this.lastPos.x}px`);
			styleRoot.style.setProperty("--cursor-y1src", `${this.lastPos.y}px`);
			styleRoot.style.setProperty("--cursor-x2", `${rect.x}px`);
			styleRoot.style.setProperty("--cursor-y2src", `${rect.y}px`);
			styleRoot.style.setProperty("--cursor-offset-y", `${0}px`);
			if (noAnimate) {
				this.lastPos = rect;
				return;
			}
			this.cursorElement.removeClass("x-cursor0");
			this.cursorElement.removeClass("x-cursor1");
			// this.cursorElement.getAnimations().forEach((anim) => anim.cancel());

			datumTop = datumElement.getBoundingClientRect().top;
			aw.requestAnimationFrame((time) => {
				this.cursorElement.addClass(`x-cursor${this.styleCount}`);
				this.lastPos = rect;
			});
		};


		const supportVIMMode = true;
		const eventNames = ["keydown", "mousedown", "touchend", ...(supportVIMMode ? ["keyup", "mouseup", "touchstart"] : [])];
		for (const event of eventNames) {
			registerDomEvent(aw, event, (ev: Event) => {
				moveCursor(ev);
			});
		}
		let triggered = false;
		// Handles scroll till scroll is finish.
		const applyWheelScroll = (last?: number | boolean) => {
			if (!triggered) {
				requestAnimationFrame(() => {
					if (datumElement) {
						const curTop = datumElement.getBoundingClientRect().top;
						const diff = curTop - datumTop;
						styleRoot.style.setProperty("--cursor-offset-y", `${diff}px`);
						if (last === false || last != diff) {
							requestAnimationFrame(() => applyWheelScroll(diff));
						} else if (last == diff) {
							moveCursor(undefined, true);
						}
					}
					triggered = false;
				});
				triggered = true;
			}
		}
		registerDomEvent(aw, "wheel", (e: WheelEvent) => {
			applyWheelScroll(false);
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
