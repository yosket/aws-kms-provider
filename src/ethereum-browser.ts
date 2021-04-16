import jaysonPromiseBrowserClient from "jayson/promise/lib/client/browser";
import PromiseClientBrowser from "jayson/promise/lib/client/browser/index";

export class EthereumBrowser {
  private client: PromiseClientBrowser;
  constructor(endpoint: string) {
    const url = new URL(endpoint);

    this.client = this.getClient(url);
  }

  private getClient(url: URL): PromiseClientBrowser {
    return new jaysonPromiseBrowserClient(async (request) => {
      const options = {
        method: 'POST',
        body: request,
        headers: { 'Content-Type': 'application/json' },
      };
      const res = await fetch(url.href, options);
      return res.text();
    }, {})
  }

  public async netVersion(): Promise<string> {
    const response = await this.client.request("net_version", []);
    return response.result;
  }
}
