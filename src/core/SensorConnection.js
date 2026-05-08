class SensorConnection {
    constructor(onMatrixUpdate, onStatusChange) {
        this.onMatrixUpdate = onMatrixUpdate;
        this.onStatusChange = onStatusChange;
        this.ws = null;
        this.rotationMatrix = null;
    }

    connect(host, port) {
        this.disconnect();
        const url = `ws://${host}:${port}/sensor/connect?type=android.sensor.rotation_vector`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            this.onStatusChange('connected');
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.values && data.values.length >= 4) {
                    const matrix = this._quaternionToMatrix(data.values);
                    this.rotationMatrix = matrix;
                    this.onMatrixUpdate(matrix);
                }
            } catch (e) {
                console.warn('SensorConnection: failed to parse message', e);
            }
        };

        this.ws.onerror = () => this.onStatusChange('error');

        this.ws.onclose = () => {
            this.rotationMatrix = null;
            this.onStatusChange('disconnected');
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            this.ws.close();
            this.ws = null;
        }
        this.rotationMatrix = null;
        this.onStatusChange('disconnected');
    }

    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }

    // Ported from Android SensorManager.getRotationMatrixFromVector.
    // values = [x, y, z, w, ...], output is column-major 4x4 for WebGL.
    _quaternionToMatrix(values) {
        const q1 = values[0], q2 = values[1], q3 = values[2];
        let q0 = values[3] !== undefined
            ? values[3]
            : Math.sqrt(Math.max(0, 1 - q1*q1 - q2*q2 - q3*q3));

        const sq_q1 = 2*q1*q1, sq_q2 = 2*q2*q2, sq_q3 = 2*q3*q3;
        const q1_q2 = 2*q1*q2, q3_q0 = 2*q3*q0;
        const q1_q3 = 2*q1*q3, q2_q0 = 2*q2*q0;
        const q2_q3 = 2*q2*q3, q1_q0 = 2*q1*q0;

        const R = new Float32Array(16);
        R[0]  = 1 - sq_q2 - sq_q3;  R[4]  = q1_q2 - q3_q0;      R[8]  = q1_q3 + q2_q0;
        R[1]  = q1_q2 + q3_q0;      R[5]  = 1 - sq_q1 - sq_q3;  R[9]  = q2_q3 - q1_q0;
        R[2]  = q1_q3 - q2_q0;      R[6]  = q2_q3 + q1_q0;      R[10] = 1 - sq_q1 - sq_q2;
        R[15] = 1;
        return R;
    }
}
