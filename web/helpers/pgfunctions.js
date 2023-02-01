import { Session } from '@shopify/shopify-api/dist/auth/session/index.js';
import graphql from './shopify-graphql.js';
import gql from 'graphql-tag';
import fetch from 'node-fetch'
import postgres from 'postgres';
import dotenv from "dotenv";
dotenv.config();

const sql = postgres({
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.DB,
    username: process.env.PGUSER,
    password: process.env.PGPASSWORD
});

export async function storeCallback(session) {
    try {
        const checkForExisting = await sql`
            select * 
            from universal_api_test.sessions
            where shop = ${session.shop}
        `;
        if (checkForExisting.length > 0) {
            const update = await sql`
                update universal_api_test.sessions set
                id = ${session.id},
                domain_id = ${session.id},
                state = ${session.state},
                scope = ${session.scope}
                where shop = ${session.shop}

                returning *
            `;
        }
        else {
            const entry = await sql`
                insert into universal_api_test.sessions (
                    shop,
                    id,
                    domain_id,
                    accessToken,
                    state,
                    scope,
                    isonline
                ) values (
                    ${session.shop},
                    ${session.id},
                    ${session.id},
                    ${session.accessToken},
                    ${session.state},
                    ${session.scope},
                    false
                )
                returning *
            `;
            const topic = "APP_UNINSTALLED";
            const callbackUrl = `${process.env.HOST}/api/webhooks`;
            console.log(callbackUrl);
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
        return true;
    } catch (e) {
        console.log(e);
    }
}
export async function loadCallback(id) {
    try {
        const search = await sql`
        select * from universal_api_test.sessions
        where id = ${id}
        or domain_id = ${id}
        `;
        const searchResult = search[0];
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
        return session;
    } catch (e) {
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
    const search = await sql`
        select * from universal_api_test.sessions
        where shop = ${shop}
    `;
    return search
}
export async function deleteSessionsCallback(shop) {
    const search = await sql`
        select * from universal_api_test.sessions
        where shop = ${shop}
    `;
    return search
}
export async function deleteAccountByShop(shop) {
    const deleteShop = await sql`
        delete from universal_api_test.sessions
        where shop = ${shop}
    `;
    return deleteShop;
}

export async function getTracksByArtist(artist) {
    const tracks = await sql`
        select * from universal_api_test.tracks
        where lower(artists) like ${'%' + artist.toLowerCase() + '%'}
    `;
    return tracks;
}
export async function getTrackbyIsrc(isrc) {
    const track = await sql`
    select * from universal_api_test.tracks
    where isrc = ${isrc}
`;
return track[0];
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
    const query = await sql`insert into universal_api_test.tracks (
        isrc,
        img_uri,
        title,
        artists,
        preview_url
        ) values (
        ${track.external_ids.isrc},
        ${track.album.images[0].url},
        ${track.name},
        ${artistNames},
        ${track.preview_url}
        )
        returning *
        `;
    return query[0];
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