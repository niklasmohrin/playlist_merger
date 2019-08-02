const express = require("express");
const request = require("request");
const querystring = require("querystring");

require("dotenv").config();
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const USER_NAME = process.env.USER_NAME;

const app = express();

app.get("/login", function(req, res) {
	const scopes = "user-read-private user-read-email playlist-read-private";
	res.redirect(
		"https://accounts.spotify.com/authorize" +
			"?response_type=code" +
			"&client_id=" +
			client_id +
			(scopes ? "&scope=" + encodeURIComponent(scopes) : "") +
			"&redirect_uri=" +
			encodeURIComponent("http://localhost:8000/callback")
	);
});

app.get("/callback", (req, res, next) => {
	request.post(
		{
			url: "https://accounts.spotify.com/api/token",
			form: {
				code: req.query.code,
				grant_type: "authorization_code",
				redirect_uri: "http://localhost:8000/callback"
			},
			headers: {
				Authorization:
					"Basic " +
					Buffer.from(`${client_id}:${client_secret}`).toString("base64")
			},
			json: true
		},
		(err, response, body) => {
			if (!err && response.statusCode === 200) {
				const { access_token, refresh_token } = body;
				res.redirect(
					"http://localhost:8000/playlists?" +
						querystring.stringify({ access_token, refresh_token })
				);
			} else {
				console.log({ err });
				res.redirect("http://localhost:8000/home" + querystring.stringify(err));
			}
		}
	);
});

app.get("/home", (req, res, next) => {
	res.send(req.query);
});

app.get("/playlists", async (req, res, next) => {
	const { access_token } = req.query;
	request.get(
		{
			url: "https://api.spotify.com/v1/me/playlists",
			headers: {
				Authorization: "Bearer " + access_token
			}
		},
		(err, response, body) => {
			if (!err && response.statusCode === 200) {
				const playlists = JSON.parse(body).items;
				if (!playlists) {
					res.redirect("/home?err=noLists");
					return;
				}
				const owned_playlists = playlists.filter(
					el => el.owner.id === USER_NAME
				);
				const pl_names = owned_playlists.map(el => el.name);
				// console.log(owned_playlists);
				res.send(pl_names);
			} else {
				console.log({ err });
				res.redirect("http://localhost:8000/home" + querystring.stringify(err));
			}
		}
	);
});

app.get("/", (req, res, next) =>
	res.send('Hello World<br /><a href="/login">login</a>')
);
app.listen(8000, () => console.log("Server listening at port 8000"));
