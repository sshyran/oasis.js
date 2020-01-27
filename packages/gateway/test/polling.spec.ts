import PollingService from '../src/polling';
import { Http } from '../src/http';
import { PollServiceResponse, ExecuteServiceEvent, Event } from '../src/api';

const assert = require('assert');

describe('PollingService', () => {
  it('Polls for a single request id immediately', async () => {
    const id = 0;
    const responses: PollServiceResponse[] = [successPollResponse(id)];
    const service = pollingService(responses);
    const response = await service.response(id);
    expect(response).toEqual(successEvent(id));
  });

  it('Polls for a single request id after receiving no events', async () => {
    const id = 0;
    const responses: PollServiceResponse[] = [
      emptyPollResponse(),
      emptyPollResponse(),
      emptyPollResponse(),
      emptyPollResponse(),
      successPollResponse(id),
    ];
    const service = pollingService(responses);
    const response = await service.response(id);

    expect(response).toEqual(successEvent(id));
  });

  // The following test cases create a bunch of promises in parallel and expect
  // them all to be resolved.
  const testCases = [
    {
      label: 'Polls for a group of contiguously arriving request ids',
      orderedRequests: () => range(0, 10),
      orderedResponses: () => range(0, 10).map(k => successPollResponse(k)),
    },
    {
      label: 'Polls for a group of reverse arriving request ids',
      orderedRequests: () => range(0, 10),
      orderedResponses: () =>
        reverse(range(0, 10).map(k => successPollResponse(k))),
    },

    {
      label: 'Polls for a group of randomly arriving request ids starting at 0',
      orderedRequests: () => range(0, 10),
      orderedResponses: () =>
        shuffle(range(0, 10).map(k => successPollResponse(k))),
    },
    {
      label:
        'Polls for a group of randomly arriving request ids starting at 10',
      orderedRequests: () => range(10, 20),
      orderedResponses: () =>
        shuffle(range(10, 20).map(k => successPollResponse(k))),
    },

    {
      label:
        'Polls for a group of randomly arriving request ids starting randomly',
      orderedRequests: () => shuffle(range(10, 20)),
      orderedResponses: () =>
        shuffle(range(10, 20).map(k => successPollResponse(k))),
    },
  ];

  testCases.forEach(async t => {
    it(t.label, async () => {
      // Setup the service so that the http requests returns these responses.
      const service = pollingService(t.orderedResponses());

      // Block http requests until the setup is complete.
      // @ts-ignore
      service.session.isBlocked = true;

      // Queue up requests for all the responses.
      const ids = t.orderedRequests();
      const promises: Promise<Event>[] = ids.map(k => {
        return service.response(k);
      });

      // Unblock http requests. The polling service will not start receiving responses.
      // @ts-ignore
      service.session.isBlocked = false;

      const results = await Promise.all(promises);

      const expectedResults = ids.map(k => {
        return successEvent(k);
      });

      results.forEach((r, ix) => {
        expect(results[ix]).toEqual(expectedResults[ix]);
      });
    });
  });
});

/**
 * MockHttp mocks out the http response from the developer gateway.
 */
class MockSession implements Http {
  public isBlocked = false;

  private responseCounter: number;

  public constructor(private responses: PollServiceResponse[]) {
    this.responseCounter = 0;
  }

  public async request(
    _method: string,
    _api: string,
    _body: Record<string, any>
  ): Promise<any> {
    if (this.isBlocked) {
      return emptyPollResponse();
    }

    assert.equal(this.responseCounter < this.responses.length, true);

    const response = this.responses[this.responseCounter];
    this.responseCounter += 1;

    return response;
  }
}

function emptyPollResponse(): PollServiceResponse {
  return {
    offset: 0,
    events: null,
  };
}

function successPollResponse(id: number): PollServiceResponse {
  return {
    offset: id,
    events: [successEvent(id)],
  };
}

function successEvent(id: number): ExecuteServiceEvent {
  return {
    id,
    address: '0x0000000000000000000000000000000000000000',
    output: 'hello',
  };
}

function pollingService(responses: PollServiceResponse[]): PollingService {
  const POLLING_INTERVAL = 100;
  // Reset all services so that we have new state for this service.
  // @ts-ignore
  PollingService.SERVICES = new Map();

  const session = new MockSession(responses);

  return PollingService.instance({
    url: 'test',
    session: session,
    interval: POLLING_INTERVAL,
  });
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function reverse<T>(a: T[]) {
  return a.slice(0).reverse();
}

function range(start: number, end: number) {
  const list: number[] = [];
  for (let i = start; i < end; i += 1) {
    list.push(i);
  }
  return list;
}
