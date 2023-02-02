import { TextField, Layout, Card, Page, Stack, Button, Frame, Toast } from "@shopify/polaris";
import { useState, useCallback, useRef } from "react";
import { useAuthenticatedFetch } from "../hooks";
import { TrackModal, ArtistsModal } from "../components";


export default function HomePage() {
  const fetch = useAuthenticatedFetch();
  const [addIsrcValue, addIsrcValueUpdate] = useState('');
  const handleAddIsrc = useCallback((newValue) => addIsrcValueUpdate(newValue), []);
  const [findIsrcValue, findIsrcValueUpdate] = useState('');
  const handleFindIsrc = useCallback((newValue) => findIsrcValueUpdate(newValue), []);
  const [findArtistValue, findArtistValueUpdate] = useState('');
  const handleFindArtist = useCallback((newValue) => findArtistValueUpdate(newValue), []);

  const [track, trackUpdate] = useState({});

  const [trackModalOpen, trackModalOpenUpdate] = useState(false);
  const [artistsModalOpen, artistsModalOpenUpdate] = useState(false);

  const artistSearchResults = useRef([]);

  const isrcRegex = /^[A-Z]{2}[A-Z0-9]{3}\d{2}\d{5}$/;

  const trackAddConfirmation = track.error ? (
    <Toast content={track.message} error={true} onDismiss={() => trackUpdate({})} />
  ) : (<TrackModal
    modalOpen={trackModalOpen}
    track={track}
    modalOpenUpdate={trackModalOpenUpdate}
  />);
  return (
    <Frame>
      <Page>
        <Layout>
          <Layout.Section>
            <Card>
              <Card.Section>
                Add new track from ISRC
                <Stack alignment="vertical">
                  <TextField
                    value={addIsrcValue}
                    onChange={handleAddIsrc}
                    autoComplete="off"
                    connectedRight={
                      <Button onClick={addTrack}>
                        Add
                      </Button>
                    }
                  />
                </Stack>
              </Card.Section>
              <Card.Section>
                Find existing track by ISRC
                <Stack alignment="vertical">
                  <TextField
                    value={findIsrcValue}
                    onChange={handleFindIsrc}
                    autoComplete="off"
                    connectedRight={
                      <Button onClick={findExistingByIsrc}>
                        Find
                      </Button>
                    }
                  />
                </Stack>
              </Card.Section>
              <Card.Section>
                Find existing tracks by artist
                <Stack alignment="vertical">
                  <TextField
                    value={findArtistValue}
                    onChange={handleFindArtist}
                    autoComplete="off"
                    connectedRight={
                      <Button onClick={findExistingByArtist}>
                        Find
                      </Button>
                    }
                  />
                </Stack>
              </Card.Section>
            </Card>
          </Layout.Section>
          {trackAddConfirmation}
          <ArtistsModal
            modalOpen={artistsModalOpen}
            data={artistSearchResults.current}
            modalOpenUpdate={artistsModalOpenUpdate}
          />
        </Layout>
      </Page>
    </Frame>
  )
  async function addTrack() {
    if (!isrcRegex.test(addIsrcValue)) {
      trackUpdate({error: true, message: 'Invalid ISRC'});
      addIsrcValueUpdate('');
      return
    }
    fetch(`${window.origin}/api/add_track`, {
      body: JSON.stringify({
        isrc: addIsrcValue
      }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        trackUpdate(data);
        data.error || trackModalOpenUpdate(true);
        addIsrcValueUpdate('');
      });
  }
  async function findExistingByIsrc() {
    if (!isrcRegex.test(findIsrcValue)) {
      trackUpdate({error: true, message: 'Invalid ISRC'});
      addIsrcValueUpdate('');
      return
    }
    fetch(`${window.origin}/api/search/by_isrc/?q=${findIsrcValue}`)
      .then(response => response.json())
      .then(data => {
        trackUpdate(data);
        data.error || trackModalOpenUpdate(true);
        findIsrcValueUpdate('');
      });
  }
  async function findExistingByArtist() {
    fetch(`${window.origin}/api/search/by_artist/?q=${findArtistValue}`)
      .then(response => response.json())
      .then(data => {
        artistSearchResults.current = data;
        trackUpdate(data);
        data.error || artistsModalOpenUpdate(true);
        findArtistValueUpdate('');
      });
  }
}