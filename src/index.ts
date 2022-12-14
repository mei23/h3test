import { createServer } from 'http';
import * as h3 from 'h3';
import * as accepts from 'accepts';
import * as serveStatic from 'serve-static';
import api from './api';

async function main() {
	const app = h3.createApp();
	const router = h3.createRouter();

	// handlerで何も返さなければ次に引き継ぐ。つまりexpressで言うnext()
	app.use(h3.eventHandler(async event => {
		console.log(`Request ${event.req.url}`);
	}));

	// HEADの自動Acceptはない？

	// テキストを送る
	router.get('/text', h3.eventHandler(async event => {
		h3.setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8');	// charsetは付かないから指定する
		return 'あ';
	}));

	// JSONを送る
	router.get('/json', h3.eventHandler(async event => {
		// charsetは付かないけど仕様上はOK
		return { a: 'あ' };
	}));

	// 4xxを送る
	router.get('/403', h3.eventHandler(async event => {
		throw h3.createError({
			statusCode: 403,
			statusMessage: 'Forbidden',
			data: {
				message: 'message'
			}
		})
	}));

	// 204を送る
	router.get('/204', h3.eventHandler(async event => {
		event.res.statusCode = 204;
		return null;
		// or
		// event.res.end();
	}));

	// パラメーター
	router.get('/params/:name', h3.eventHandler(async event => {
		return { name: event.context.params.name };
	}));

	const ACTIVITY_JSON = 'application/activity+json; charset=utf-8';
	const LD_JSON = 'application/ld+json; profile="https://www.w3.org/ns/activitystreams"; charset=utf-8';

	const isAp: h3.Matcher = (url, event) => {
		if (!event) throw 'u';
		const accepted = accepts(event.req).type(['html', ACTIVITY_JSON, LD_JSON]);
		const isAp = typeof accepted === 'string' && !accepted.match(/html/);
		// ここでappendHeaderすると全部に入ってしまう
		return isAp;
	};

	// Accept: AP で返したいもの
	const apRouter = h3.createRouter();
	apRouter.get('/users/:userId', h3.eventHandler(async event => {
		h3.appendResponseHeader(event, 'Vary', 'Accept');
		return { name: event.context.params.userId };
	}));

	app.use({
		match: isAp,
		handler: apRouter.handler,
	});

	// Accept: AP以外 で返したいもの
	router.get('/users/:userId', h3.eventHandler(async event => {
		h3.appendResponseHeader(event, 'Vary', 'Accept');
		return `Non AP request for ${event.context.params.userId}`;
	}));

	// どっちでもいいもの
	router.get('/users/:userId/outbox', h3.eventHandler(async event => {
		return `outbox request for ${event.context.params.userId}`;
	}));

	app.use(router);

	app.use('/api', api.handler);

	// static file
	app.use('/static', h3.fromNodeMiddleware(serveStatic(`${__dirname}/../static`, {
		maxAge: 300 * 1000
	})));

	// listen
	const server = createServer(h3.toNodeListener(app));
	server.requestTimeout = 60 * 1000;	// 前段にリバースプロキシがあるなら不要
	server.listen(process.env.PORT || 3333);
}

main().then(() => {
	console.log('done');
})
