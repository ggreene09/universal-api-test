import {useCallback} from 'react'
import { Modal, TextStyle } from '@shopify/polaris'

export function TrackModal({modalOpen, track, modalOpenUpdate}) {
    const handleModalClose = useCallback(() => {
        modalOpenUpdate(false);
      }, []);
  return (
    <div style={{ height: '500px' }}>
    <Modal
      open={modalOpen}
      onClose={handleModalClose}
      title={track?.title}
    >
      <Modal.Section>
        <TextStyle variation="strong">Artist(s): {track?.artists?.split('|').join(', ')}</TextStyle>
        <img
          alt=""
          width="100%"
          height="100%"
          style={{
            objectFit: 'cover',
            objectPosition: 'center',
          }}
          src={track?.img_uri}
        />
        <audio controls>
          <source src={track?.preview_url}></source>
        </audio>
      </Modal.Section>

    </Modal>
  </div>
  )
}
