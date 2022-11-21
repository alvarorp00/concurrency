#include "stdlib.h"
#include "string.h"
#include "stdbool.h"
#include "stdarg.h"

#include "mongoose.h"

const char* port = "18085";
const char* root = "caal";

static bool parseConfiguration(int argc, char* argv[]);

int main(int argc, char* argv[]) {
	if (parseConfiguration(argc-1, argv+1)) {
		printf("There were errors. Exiting...\n");
		return 1;
	}
	const char* error = NULL;

	printf("Attempting to start server hosting at 127.0.0.1 on port %s\n", port);
	struct mg_server *server = mg_create_server(NULL, NULL);
	
	error = mg_set_option(server, "document_root", root);
	//TODO: If this program expands, check who deallocates error.
	if (error) {
		printf("ERROR: %s", error);
		return 2;
	}
	
	error = mg_set_option(server, "listening_port", port);
	if (error) {
		printf("ERROR: %s", error);
		return 3;
	}

	printf("Server started successfully and is hosting at 127.0.0.1 on port %s\n", port);
	printf("To close the server press CTRL-C in this terminal\n");

	for (;;) {
		mg_poll_server(server, 1000);   // Infinite loop, Ctrl-C to stop
	}
	mg_destroy_server(&server);

	return 0;
}

static bool parseConfiguration(int argc, char* argv[]) {
	bool hadError = false;
	//Just port number so far
	for (int i=0; i < argc; ++i) {

		//PORT
		if (strcmp("-p", argv[i]) == 0)  {
			if (i+1 < argc) {
				const char* optionArg = argv[i+1];
				long cmdPort = strtol(optionArg, NULL, 10);
				if (cmdPort == 0) {
					printf("Not a valid port number: %s\n", optionArg);
					hadError = true;
				} else if (cmdPort < 1 || cmdPort > 65535) {
					printf("Port number out of range: %ld\n", cmdPort);
					printf("Valid range is 1024--65535\n");
					hadError = true;
				} else {
					port = optionArg;
				}
				i++; //Skip argument to option
			}
		}
	}
	return hadError;
}
