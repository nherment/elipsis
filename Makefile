
dependencies:
	npm install

configure:
	node install/configure.js

install: dependencies configure

integration:
	node test/integration/on_boarding.turtle.js

test: integration

start:
	node-dev server.js

.PHONY: test
