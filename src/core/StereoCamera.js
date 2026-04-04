function StereoCamera(
    eyeSeparation,
    convergence,
    aspectRatio,
    FOV,
    nearClippingDistance,
    farClippingDistance)
{
    this.eyeSeparation = eyeSeparation;
    this.convergence = convergence;
    this.mAspectRatio = aspectRatio;
    this.FOV = FOV;
    this.nearClippingDistance = nearClippingDistance;
    this.farClippingDistance = farClippingDistance;

    this.calcLeftFrustum = function() {
        let top = this.nearClippingDistance * Math.tan(this.FOV / 2);
        let bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.FOV / 2) * this.convergence;
        let b = a - this.eyeSeparation / 2;
        let c = a + this.eyeSeparation / 2;

        let left = -b * this.nearClippingDistance / this.convergence;
        let right = c * this.nearClippingDistance / this.convergence;

        return m4.frustum(left, right, bottom, top, this.nearClippingDistance, this.farClippingDistance);
    };

    this.calcRightFrustum = function() {
        let top = this.nearClippingDistance * Math.tan(this.FOV / 2);
        let bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.FOV / 2) * this.convergence;
        let b = a - this.eyeSeparation / 2;
        let c = a + this.eyeSeparation / 2;

        let left = -c * this.nearClippingDistance / this.convergence;
        let right = b * this.nearClippingDistance / this.convergence;

        return m4.frustum(left, right, bottom, top, this.nearClippingDistance, this.farClippingDistance);
    };
}
