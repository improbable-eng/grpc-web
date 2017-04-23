### Running Tests

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
* Navigate to `http://validhost:9876` and the tests will run for HTTP (HTTP 1.1)
* Navigate to `https://validhost:9876`, accept the self-signed certificate, and the tests will run for HTTPS (HTTP 2)
