CAAL-LOCAL
==========

This package, CAAL-LOCAL, can be used to run [CAAL][CAAL] without accessing the [main&nbsp;hosting&nbsp;site][CAAL-HOST] at [caal.cs.aau.dk][CAAL-HOST]. Users who cannot access that site, maybe for lack of internet connection, will still be able to run the software.

CAAL runs in browsers using JavaScript. However, some browsers do not allow certain usages of JavaScript that CAAL requires, if the web application is accessed directly from a local disk (if you use Firefox you can probably run CAAL/index.html in this package directly without issues). To circumvent this restriction, this package bundles CAAL alongside a small webserver.


How to Use
----------

There are batch/shell scripts included that when run will start the webserver and open your default browser. Simply run the file that corresponds to your operating system.

If you restart the web server while having an active CAAL session, you should close the tab (and save your work), and then reopen a new session. 

Troubleshooting
---------------

If the scripts do not work, you can try starting the server manually on the command line. For example, on Linux you can start the server directly:

    ./build/linux_server

You should be informed about the address you need to visit in your browser. It might for example be `http://127.0.0.1:18015`. If the default port is not accessible, you can specify another:

	./build/linux_server -p 8080

You can use a similar approach to start the Windows and Mac servers.



[CAAL]: https://github.com/CAAL/CAAL "CAAL - Concurrency Workbench, Aalborg Edition"
[CAAL-HOST]: http://caal.cs.aau.dk/ "Main hosting site for CAAL"
