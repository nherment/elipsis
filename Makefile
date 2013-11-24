
dependencies:
	npm install

configure:
	node install/configure.js

install: dependencies configure

integration:
	node test/integration/on_boarding.turtle.js

unit:
	mocha test/unit/*

test: unit integration

start:
	node-dev server.js

.PHONY: test
