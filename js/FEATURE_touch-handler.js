class MobileTouchEventHandler {
    constructor(canvasElement) {
        this.canvasElement = canvasElement;
        this.isTouchDrawingActive = false;
        this.touchEventStartTimeValue = 0;
        
        this.setupTouchEventListeners();
    }

    setupTouchEventListeners() {
        this.canvasElement.addEventListener('touchstart', (event) => this.handleTouchStartEvent(event), false);
        this.canvasElement.addEventListener('touchmove', (event) => this.handleTouchMoveEvent(event), false);
        this.canvasElement.addEventListener('touchend', (event) => this.handleTouchEndEvent(event), false);
        this.canvasElement.addEventListener('touchcancel', (event) => this.handleTouchCancelEvent(event), false);
    }

    handleTouchStartEvent(touchEventObject) {
        touchEventObject.preventDefault();
        this.isTouchDrawingActive = true;
        this.touchEventStartTimeValue = Date.now();
        
        const firstTouchPoint = touchEventObject.touches[0];
        const canvasBoundingRect = this.canvasElement.getBoundingClientRect();
        const xCoordinateValue = firstTouchPoint.clientX - canvasBoundingRect.left;
        const yCoordinateValue = firstTouchPoint.clientY - canvasBoundingRect.top;
        
        window.drawingApplication?.handleDrawingStarted?.({ clientX: xCoordinateValue, clientY: yCoordinateValue });
    }

    handleTouchMoveEvent(touchEventObject) {
        touchEventObject.preventDefault();
        if (!this.isTouchDrawingActive) return;
        
        const firstTouchPoint = touchEventObject.touches[0];
        const canvasBoundingRect = this.canvasElement.getBoundingClientRect();
        const xCoordinateValue = firstTouchPoint.clientX - canvasBoundingRect.left;
        const yCoordinateValue = firstTouchPoint.clientY - canvasBoundingRect.top;
        
        window.drawingApplication?.handleDrawingMoved?.({ clientX: xCoordinateValue, clientY: yCoordinateValue });
    }

    handleTouchEndEvent(touchEventObject) {
        touchEventObject.preventDefault();
        this.isTouchDrawingActive = false;
        window.drawingApplication?.handleDrawingCompleted?.();
    }

    handleTouchCancelEvent(touchEventObject) {
        touchEventObject.preventDefault();
        this.isTouchDrawingActive = false;
        window.drawingApplication?.handleDrawingCompleted?.();
    }

    getIsTouchDrawingActive() {
        return this.isTouchDrawingActive;
    }
}
