### Running Tests

#### Install Self-signed Certificate

Install the `localhost` certificates of this repo found in `misc/`. Follow [this guide](http://stackoverflow.com/questions/7580508/getting-chrome-to-accept-self-signed-localhost-certificate) for Chrome.


#### Configure Hosts

As Safari on BrowserStack does not work with `https://localhost` or `https://127.0.0.1`, the tests use `https://validhost:PORT` and `https://invalidhost:PORT`. This requires adding these entries to your `/etc/hosts` file if you want to run the tests from your machine:
```
127.0.0.1	validhost
127.0.0.1	invalidhost
```

#### Running the tests locally

* Run `npm test` to start the karma test runner.
* Navigate to `https://validhost:9100` and accept the self-signed certificate.
* Navigate to `https://validhost:9105` and accept the self-signed certificate.
* Navigate to `https://invalidhost:9100` and accept the self-signed certificate.
* Navigate to `https://invalidhost:9105` and accept the self-signed certificate.
* Navigate to `https://validhost:9876`, accept the self-signed certificate, and the tests will run for HTTPS (HTTP 2)
* Navigate to `http://validhost:5432` and the tests will run for HTTP (HTTP 1.1)
