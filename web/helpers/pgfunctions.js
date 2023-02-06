import { Session } from '@shopify/shopify-api/dist/auth/session/index.js';
import graphql from './shopify-graphql.js';
import gql from 'graphql-tag';
import fetch from 'node-fetch'
import pkg from 'pg';
const { Client } = pkg;
import CryptoJS from 'crypto-js';


export async function storeCallback(session) {
    const client = new Client();
    try {
        await client.connect();

        const checkForExisting = await client.query({
            text: `select * from universal_api_test.sessions
            where shop = $1;`,
            values: [session.shop]
        });
        if (checkForExisting.length > 0) {
            const update = await client.query({
                text: `
                update universal_api_test.sessions set
                id = $1,
                domain_id = $2,
                state = $3,
                scope = $4
                where shop = $5

                returning *;
                `,
                values: [session.id, session.id, session.state, session.scope, session.shop]
            });
        }
        else {
            const encToken = CryptoJS.AES.encrypt(session.accessToken, process.env.DB_SECRET).toString();
            const entry = await client.query({
                text: `insert into universal_api_test.sessions (
                    shop,
                    id,
                    domain_id,
                    accessToken,
                    state,
                    scope,
                    isonline
                    ) values (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7
                    )`,
                values: [session.shop, session.id, session.id, encToken, session.state, session.scope, 'false']    
            });
            const topic = "APP_UNINSTALLED";
            const callbackUrl = `${process.env.HOST}/api/webhooks`;
            const query = gql`mutation {
                webhookSubscriptionCreate(
                  topic: ${topic}
                  webhookSubscription: {
                    callbackUrl: "${callbackUrl}"
                    format: JSON
                  }
                ) {
                  userErrors {
                    field
                    message
                  }
                  webhookSubscription {
                    id
                  }
                }
              }`;
            const registerHook = await graphql(session.shop, session.accessToken, query);
        }
        await client.end();
        return true;
    } catch (e) {
        await client.end()
        console.log(e);
    }
}
export async function loadCallback(id) {
    const client = new Client();
    try {
        await client.connect();
        const search = await client.query({
            text: `select * from universal_api_test.sessions
            where id = $1
            or domain_id = $2`,
            values: [id, id],
        });
        const searchResult = search.rows[0];
        const session = new Session(
            searchResult.id,
            searchResult.shop,
            searchResult.state,
            false
        );
        session.scope = searchResult.scope;
        session.onlineAccessInfo = JSON.parse(searchResult.onlineaccessinfo);
        session.accessToken = searchResult.accesstoken;
        const date = new Date();
        date.setDate(date.getDate() + 1);
        session.expires = date;
        if (session.expires && typeof session.expires === 'string') {
            session.expires = new Date(session.expires);
        }
        await client.end()
        return session;
    } catch (e) {
        await client.end()
        console.log(e);
    }
}
export async function deleteCallback(id) {
    try {
        return false;
    } catch (e) {
        throw new Error(e)
    }
}

export async function findSessionsByShopCallback(shop) {
    const client = new Client();
    await client.connect();
    const search = await client.query({
        text: `select * from universal_api_test.sessions
        where shop = $1`,
        values: [shop],
    });
    await client.end()
    return search.rows
}
export async function deleteSessionsCallback(shop) {
    const client = new Client();
    await client.connect();
    const search = await client.query({
        text: `select * from universal_api_test.sessions
        where shop = $1`,
        values: [shop],
    });
    await client.end()
    return search.rows
}
export async function deleteAccountByShop(shop) {
    const client = new Client();
    await client.connect();
    const deleteShop = await client.query({
        text: `delete from universal_api_test.sessions
        where shop = $1`,
        values: [shop],
    });
    await client.end()
    return deleteShop;
}

export async function getTracksByArtist(artist) {
    const client = new Client();
    await client.connect();
    const tracks = await client.query({
        text: `select * from universal_api_test.tracks
        where lower(artists) like '%'|| $1 || '%'`,
        values: [artist.toLowerCase()],
    });
    await client.end()
    return tracks.rows;
}
export async function getTrackbyIsrc(isrc) {
    const client = new Client();
    await client.connect();
    const track = await client.query({
        text: `select * from universal_api_test.tracks
    where isrc = $1`,
        values: [isrc]
    });
    await client.end()
    return track.rows[0];
}
export async function addTrack(o) {
    const checkExistingTracks = await getTrackbyIsrc(o.isrc);
    if (typeof checkExistingTracks !== 'undefined') return { error: true, message: 'You already entered that track!' };
    const token = await getSpotifyAccessToken();
    const call = await fetch(`https://api.spotify.com/v1/search?q=isrc:${o.isrc}&type=track`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    const response = await call.json();
    const track = response.tracks.items.reduce((mostPopular, item) => {
        return item.popularity > mostPopular.popularity ? item : mostPopular;
    }, { popularity: -1, error: true, message: 'No tracks found' });
    if (track.error) return track;
    const artistNames = track.artists?.map(artist => artist.name).join('|');
    const client = new Client();
    await client.connect();
    const query = await client.query({
        text: `insert into universal_api_test.tracks (
        isrc,
        img_uri,
        title,
        artists,
        preview_url
        ) values (
        $1,
        $2,
        $3,
        $4,
        $5
        )
        returning *`,
        values: [track.external_ids.isrc, track.album.images[0].url, track.name, artistNames, track.preview_url]
    });
    await client.end()
    return query.rows[0];
}
async function getSpotifyAccessToken() {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    const call = await fetch('https://accounts.spotify.com/api/token', {
        headers: {
            'Authorization': 'Basic ' + (Buffer.from(process.env.SPOTIFY_CLIENT_ID + ':' + process.env.SPOTIFY_CLIENT_SECRET).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params,
        method: 'POST'
    }
    );
    const result = await call.json();
    return result.access_token;
}