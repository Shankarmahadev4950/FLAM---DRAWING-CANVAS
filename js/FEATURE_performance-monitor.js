class PerformanceMetricsMonitor {
    constructor() {
        this.framesPerSecondValue = 0;
        this.renderFrameCounterValue = 0;
        this.lastMeasurementTimeValue = performance.now();
        this.networkLatencyMillisecondsValue = 0;
        
        this.startPerformanceMonitoring();
    }

    startPerformanceMonitoring() {
        setInterval(() => {
            const currentTimeValue = performance.now();
            const timeDeltaValue = currentTimeValue - this.lastMeasurementTimeValue;
            
            if (this.renderFrameCounterValue > 0) {
                this.framesPerSecondValue = Math.round(1000 / (timeDeltaValue / this.renderFrameCounterValue));
            }
            
            this.renderFrameCounterValue = 0;
            this.lastMeasurementTimeValue = currentTimeValue;
            
            this.updatePerformanceMetricsDisplay();
        }, 1000);
    }

    recordFrameForMetrics() {
        this.renderFrameCounterValue++;
    }

    updatePerformanceMetricsDisplay() {
        const fpsDisplayElement = document.getElementById('fps-value');
        if (fpsDisplayElement) {
            fpsDisplayElement.textContent = this.framesPerSecondValue;
        }
    }

    updateNetworkLatencyMetric(latencyInMilliseconds) {
        this.networkLatencyMillisecondsValue = latencyInMilliseconds;
        
        const latencyDisplayElement = document.getElementById('latency-value');
        if (latencyDisplayElement) {
            latencyDisplayElement.textContent = latencyInMilliseconds + 'ms';
        }
    }

    getPerformanceMetricsObject() {
        return {
            fps: this.framesPerSecondValue,
            latency: this.networkLatencyMillisecondsValue
        };
    }
}
