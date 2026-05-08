class AudioManager {
    constructor() {
        this.context = new AudioContext();
        this.buffer = null;
        this.source = null;
        this.panner = null;
        this.isPlaying = false;
        this.isPaused = false;
    }

    async load(url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.buffer = await this.context.decodeAudioData(arrayBuffer);

        this.filter = this.context.createBiquadFilter();
        this.filter.type = 'highshelf';
        this.filter.frequency.value = 3000;
        this.filter.gain.value = 0;

        this.panner = this.context.createPanner();
        this.panner.panningModel = 'HRTF';
        this.panner.distanceModel = 'inverse';
        this.panner.refDistance = 1;

        this.filter.connect(this.panner);
        this.panner.connect(this.context.destination);

        const splitter = this.context.createChannelSplitter(2);
        this.panner.connect(splitter);

        this.analyserL = this.context.createAnalyser();
        this.analyserR = this.context.createAnalyser();
        this.analyserL.fftSize = 256;
        this.analyserR.fftSize = 256;
        splitter.connect(this.analyserL, 0);
        splitter.connect(this.analyserR, 1);
    }

    async play() {
        if (!this.buffer) return;
        if (this.isPaused) {
            await this.context.resume();
            this.isPaused = false;
            this.isPlaying = true;
        } else if (!this.isPlaying) {
            await this._startSource();
        }
    }

    async pause() {
        if (!this.isPlaying) return;
        await this.context.suspend();
        this.isPlaying = false;
        this.isPaused = true;
    }

    async restart() {
        if (this.source) {
            this.source.stop();
            this.source = null;
        }
        await this.context.resume();
        this.isPaused = false;
        await this._startSource();
    }

    setPannerPosition(x, y, z) {
        if (this.panner) this.panner.setPosition(x, y, z);
    }

    setFilterEnabled(enabled) {
        if (this.filter) this.filter.gain.value = enabled ? 12 : 0;
    }

    getLevels() {
        if (!this.analyserL || !this.analyserR) return { left: 0, right: 0 };
        return { left: this._rms(this.analyserL), right: this._rms(this.analyserR) };
    }

    _rms(analyser) {
        const data = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
        }
        return Math.sqrt(sum / data.length);
    }

    async _startSource() {
        await this.context.resume();
        this.source = this.context.createBufferSource();
        this.source.buffer = this.buffer;
        this.source.loop = true;
        this.source.connect(this.filter);
        this.source.start(0);
        this.isPlaying = true;
    }
}
