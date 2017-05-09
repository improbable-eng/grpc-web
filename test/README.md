### Running Tests

#### Install Self-signed Certificate

Install the `localhost` certificates of this repo found in `misc/`. Follow [this guide](http://stackoverflow.com/questions/7580508/getting-chrome-to-accept-self-signed-localhost-certificate) for Chrome.


#### Configure Hosts

As Safari on BrowserStack does not work with `https://localhost` or `https://127.0.0.1`, the tests use `https://testhost:PORT` and `https://corshost:PORT`. This requires adding these entries to your `/etc/hosts` file if you want to run the tests from your machine:
```
127.0.0.1	testhost
127.0.0.1	corshost
```

#### Running the tests locally

* Run `npm test` to start the karma test runner.
* Navigate to these hosts and accept the self-signed certificate:
* * `https://testhost:9090`
* * `https://testhost:9095`
* * `https://testhost:9100`
* * `https://testhost:9105`
* * `https://corshost:9090`
* * `https://corshost:9095`
* * `https://corshost:9100`
* * `https://corshost:9105`
* Navigate to `https://testhost:9876`, accept the self-signed certificate, and the tests will run
