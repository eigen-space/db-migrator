/* eslint-disable */
export class Runner {

    constructor() {
        this.run = this.run.bind(this);
    }

    run(): void {
        console.log('do some job...');
        setTimeout(this.run, 2000);
    }
}