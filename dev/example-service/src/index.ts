import { Runner } from './runner/runner';
import { migrate } from './pre-start/migrate';

main();

async function main(): Promise<void> {
    await migrate();

    const runner = new Runner();
    runner.run();
}