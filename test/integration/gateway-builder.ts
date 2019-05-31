import {
  HttpDeveloperGateway,
  Http
} from '../../src/oasis-gateway/developer-gateway/http';
import {
  ServicePollApi,
  SubscribePollApi,
  SubscribeApi
} from '../../src/oasis-gateway/developer-gateway/api';
import { Address } from '../../src/types';
import keccak256 from '../../src/utils/keccak256';
import cbor from '../../src/utils/cbor';
import * as bytes from '../../src/utils/bytes';
import PollingService from '../../src/oasis-gateway/developer-gateway/polling';

/**
 * Builds a gateway with all HTTP requests mocked out.
 */
export default class GatewayBuilder {
  private serviceResponses: any = [];
  private subscribeResponses: any = [];

  public deploy(address: string): GatewayBuilder {
    // Deploy response.
    this.addServiceResponse({
      event: { address }
    });
    // getPublicKey response.
    this.addServiceResponse({
      event: {}
    });
    return this;
  }

  public rpc(output: any): GatewayBuilder {
    this.addServiceResponse({
      event: { output: output }
    });
    return this;
  }

  public subscribe(event: Object): GatewayBuilder {
    let encodedEvent = bytes.toHex(cbor.encode(event));
    let log = { data: encodedEvent };
    let data = Buffer.from(JSON.stringify(log)).toString('hex');

    this.addSubscribeResponse({
      event: { data }
    });

    return this;
  }

  public gateway(): HttpDeveloperGateway {
    let url = 'test';
    let gateway = new HttpDeveloperGateway(url);
    let http = new MockHttp(this.serviceResponses, this.subscribeResponses);
    // @ts-ignore
    gateway.http = http;
    // @ts-ignore
    gateway.polling.http = http;
    // @ts-ignore
    gateway.polling.interval = 100;

    // One subscription is allowed for this mock gateway, so preset it's polling
    // parameters.
    let subscriptionPoll = PollingService.instance({
      url: url,
      queueId: 0
    });
    // @ts-ignore
    subscriptionPoll.http = http;
    // @ts-ignore
    subscriptionPoll.interval = 100;
    return gateway;
  }

  /**
   * The response will have a request id based upon its position in the serviceResponses
   * array.
   */
  private addServiceResponse(response: any) {
    response.event.id = this.serviceResponses.length;
    this.serviceResponses.push(response);
  }

  private addSubscribeResponse(response: any) {
    response.event.id = this.subscribeResponses.length;
    this.subscribeResponses.push(response);
  }
}

/**
 * MockHttp mocks out the http response from the developer gateway.
 * Supports a single subscription at a time.
 */
class MockHttp implements Http {
  // Flag for enabling/disabling logging to see what requests would be going to/from
  // the dev gateway. Useful for debugging.
  private logging = false;

  // For more organized logging.
  private loggingLine = '--------------------------------';

  private count: number = 0;

  public constructor(
    private serviceResponses: any[],
    private subscribeResponses: any[]
  ) {}

  public async post(api: string, body: any): Promise<any> {
    if (this.logging) {
      console.debug(
        `request:  ${api}\n${this.loggingLine}\n${JSON.stringify(body)}}`
      );
    }

    let response = await this._post(api, body);

    if (this.logging) {
      console.debug(
        `response: ${api}\n${this.loggingLine}\n${JSON.stringify(response)}`
      );
    }

    return response;
  }

  private async _post(api: string, body: any): Promise<any> {
    // Service execution.
    if (api === ServicePollApi) {
      this.count += 1;
      return {
        offset: body.offset,
        events: [this.serviceResponses[body.offset].event]
      };
    }
    // Subscription log.
    else if (api === SubscribePollApi) {
      if (body.offset >= this.subscribeResponses.length) {
        return { offset: body.offset, events: null };
      }
      return {
        offset: body.offset,
        events: [this.subscribeResponses[body.offset].event]
      };
    }
    // Subscribe queue id (handles the initial, non-poll request).
    else if (api === SubscribeApi) {
      // The mock only supports a single queue so just use 0 as the queueId.
      return { id: 0 };
    }
    // Service poll offset (handles the initial, non-poll request).
    else {
      return { id: this.count };
    }
  }
}