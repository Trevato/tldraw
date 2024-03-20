import React, { useMemo } from 'react'
import { Vec } from '../primitives/Vec'
import {
	preventDefault,
	releasePointerCapture,
	setPointerCapture,
	stopEventPropagation,
} from '../utils/dom'
import { getPointerInfo } from '../utils/getPointerInfo'
import { useEditor } from './useEditor'

export function useCanvasEvents() {
	const editor = useEditor()

	const events = useMemo(
		function canvasEvents() {
			// Track the last screen point
			let lastX: number, lastY: number

			function onPointerDown(e: React.PointerEvent) {
				if ((e as any).isKilled) return

				if (e.button === 2) {
					editor.dispatch({
						type: 'pointer',
						target: 'canvas',
						pagePoint: editor.inputs.currentPagePoint.clone(),
						name: 'right_click',
						...getPointerInfo(e),
					})
					return
				}

				if (e.button !== 0 && e.button !== 1 && e.button !== 5) return

				setPointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					pagePoint: editor.inputs.currentPagePoint.clone(),
					name: 'pointer_down',
					...getPointerInfo(e),
				})

				if (editor.getOpenMenus().length > 0) {
					editor.updateInstanceState({
						openMenus: [],
					})

					document.body.click()
					editor.getContainer().focus()
				}
			}

			function onPointerMove(e: React.PointerEvent) {
				if ((e as any).isKilled) return

				if (e.clientX === lastX && e.clientY === lastY) return
				lastX = e.clientX
				lastY = e.clientY

				const { screenBounds } = editor.getInstanceState()
				const { x: cx, y: cy, z: cz } = editor.getCamera()
				const sx = lastX - screenBounds.x
				const sy = lastY - screenBounds.y
				const sz = e.pressure

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					name: 'pointer_move',
					pagePoint: new Vec(sx / cz - cx, sy / cz - cy, sz ?? 0.5),
					...getPointerInfo(e),
				})
			}

			function onPointerUp(e: React.PointerEvent) {
				if ((e as any).isKilled) return
				if (e.button !== 0 && e.button !== 1 && e.button !== 2 && e.button !== 5) return
				lastX = e.clientX
				lastY = e.clientY

				releasePointerCapture(e.currentTarget, e)

				editor.dispatch({
					type: 'pointer',
					target: 'canvas',
					pagePoint: editor.inputs.currentPagePoint.clone(),
					name: 'pointer_up',
					...getPointerInfo(e),
				})
			}

			function onPointerEnter(e: React.PointerEvent) {
				if ((e as any).isKilled) return
				if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return
				const canHover = e.pointerType === 'mouse' || e.pointerType === 'pen'
				editor.updateInstanceState({ isHoveringCanvas: canHover ? true : null })
			}

			function onPointerLeave(e: React.PointerEvent) {
				if ((e as any).isKilled) return
				if (editor.getInstanceState().isPenMode && e.pointerType !== 'pen') return
				const canHover = e.pointerType === 'mouse' || e.pointerType === 'pen'
				editor.updateInstanceState({ isHoveringCanvas: canHover ? false : null })
			}

			function onTouchStart(e: React.TouchEvent) {
				;(e as any).isKilled = true
				// todo: investigate whether this effects keyboard shortcuts
				// god damn it, but necessary for long presses to open the context menu
				document.body.click()
				preventDefault(e)
			}

			function onTouchEnd(e: React.TouchEvent) {
				;(e as any).isKilled = true
				if (
					(e.target as HTMLElement).tagName !== 'A' &&
					(e.target as HTMLElement).tagName !== 'TEXTAREA'
				) {
					preventDefault(e)
				}
			}

			function onDragOver(e: React.DragEvent<Element>) {
				preventDefault(e)
			}

			async function onDrop(e: React.DragEvent<Element>) {
				preventDefault(e)
				if (!e.dataTransfer?.files?.length) return

				const files = Array.from(e.dataTransfer.files)

				await editor.putExternalContent({
					type: 'files',
					files,
					point: editor.screenToPage({ x: e.clientX, y: e.clientY }),
					ignoreParent: false,
				})
			}

			function onClick(e: React.MouseEvent) {
				stopEventPropagation(e)
			}

			return {
				onPointerDown,
				onPointerMove,
				onPointerUp,
				onPointerEnter,
				onPointerLeave,
				onDragOver,
				onDrop,
				onTouchStart,
				onTouchEnd,
				onClick,
			}
		},
		[editor]
	)

	return events
}
