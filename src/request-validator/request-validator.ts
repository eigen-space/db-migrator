import { RequestData } from './request-data';

export class RequestValidator {

    validate(data: RequestData): void {
        const { service, database } = data.params;

        if (!service) {
            throw new Error('You should specify the name of service which is going to migrate db.');
        }

        if (!database) {
            throw new Error('You should specify the database name you want to migrate.');
        }

        if (!data.files || Object.keys(data.files).length === 0) {
            throw new Error('');
        }

        if (1 < Object.keys(data.files).length) {
            throw new Error(
                'You should send only one file. ' +
                'It should be an archive of the directory with change sets.'
            );
        }
    }
}