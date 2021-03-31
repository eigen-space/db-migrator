export class Runner {

    constructor() {
        this.run = this.run.bind(this);
    }

    run(): void {
        // eslint-disable-next-line no-console
        console.log('do some job...');
        setTimeout(this.run, 2000);
    }
}