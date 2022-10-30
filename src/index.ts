import { createServer } from 'http';
import * as h3 from 'h3';
import * as accepts from 'accepts';
import { inspect } from 'util';

async function main() {
	const app = h3.createApp();
	const router = h3.createRouter();

	// HEADの自動Acceptはない？

	// テキストを送る
	router.get('/text', h3.eventHandler(async event => {
		event.res.setHeader('Content-Type', 'text/plain; charset=utf-8');	// charsetは付かないから指定する
		return 'あ';
	}));

	// JSONを送る
	router.get('/json', h3.eventHandler(async event => {
		// charsetは付かないけど仕様上はOK
		return { a: 'あ' };
	}));

	// 4xxを送る
	router.get('/403', h3.eventHandler(async event => {
		event.res.statusCode = 403;
		return 'a';	// HTML charsetなしになる
	}));

	// 204を送る
	router.get('/204', h3.eventHandler(async event => {
		event.res.statusCode = 204;
		return null;
		// or
		// event.res.end();
	}));

	router.get('/param/:name', h3.eventHandler(async event => {
		return { name: event.context.params.name };
	}));


	const ACTIVITY_JSON = 'application/activity+json; charset=utf-8';
	const LD_JSON = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"; charset=utf-8';

	const isAp: h3.Matcher = (url, event) => {
		if (!event) throw 'u';
		const accepted = accepts(event.req).type(['html', ACTIVITY_JSON, LD_JSON]);
		const isAp = typeof accepted === 'string' && !accepted.match(/html/);
		return isAp;
	};

	const pickParam = (url: string | undefined) => {
		if (url == null) return url;
		const m = url.match(/^[/]([^/]+)/);
		return m?.[1];
	}

	app.use({
		route: '/users/',	// 非Routerではparam使えない
		match: isAp,
		handler: h3.eventHandler(async event => {
			event.res.setHeader('Vary', 'Accept');
			h3.assertMethod(event, 'GET');
			const userId = pickParam(event.req.url);
			return `AP request for ${userId}\n`;
		}),
	});

	app.use({
		route: '/users/',
		handler: h3.eventHandler(async event => {
			event.res.setHeader('Vary', 'Accept');
			h3.assertMethod(event, 'GET');
			const userId = pickParam(event.req.url);
			return `Non AP request for ${userId}\n`;
		}),
	});


	app.use(router);

	// listen
	const server = createServer(h3.toNodeListener(app));
	server.requestTimeout = 60 * 1000;	// 前段にリバースプロキシがあるなら不要
	server.listen(process.env.PORT || 3333);
}

main().then(() => {
	console.log('done');
})