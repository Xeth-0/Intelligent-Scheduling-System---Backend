# Core API for ISS

## TODO

- [x] Refactor the auth module and the strategies
- [x] Fix the configuration (config service and module, add zod for validation)
- [x] Finish the schema migration (Users module needs a rewrite)
- [x] Fix remaining eslint errors and other issues
- [x] Maybe rewrite the tests
- [ ] Add the scheduling api, and set up the microservice calls
  - [x] Add the api call to the scheduling service
  - [ ] Modify the db schema. Right now "Schedule" is equivalent to "ScheduledItem". We need to store the association between the scheduled items that makes up the schedule.
  - [ ] Add the logic to the scheduling service to store the schedule in the db
  - [ ] Finalize the api schema. Responses and Requests need to be properly defined and documented. 

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
