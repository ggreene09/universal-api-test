import { useCallback } from 'react'
import { Modal, TextStyle } from '@shopify/polaris'

export function ArtistsModal({ modalOpen, data, modalOpenUpdate }) {
    const handleModalClose = useCallback(() => {
        modalOpenUpdate(false);
    }, []);
    return (
        <div style={{ height: '500px' }}>
            <Modal
                open={modalOpen}
                onClose={handleModalClose}
                title="Results"
            >

                {data.map(track => {
                    return (
                        <Modal.Section>
                            <TextStyle variation="strong">Artist(s): {track?.artists?.split('|').join(', ')}</TextStyle><br />
                            <TextStyle variation="strong">Title: {track?.title}</TextStyle><br />
                            <TextStyle variation="strong">ISRC: {track?.isrc}</TextStyle><br />
                            <img
                                alt=""
                                width="10%"
                                height="10%"
                                style={{
                                    objectFit: 'cover',
                                    objectPosition: 'center',
                                    marginRight:'15px'
                                }}
                                src={track?.img_uri}
                            />
                            <audio controls>
                                <source src={track?.preview_url}></source>
                            </audio>
                        </Modal.Section>
                    )
                })}

            </Modal>
        </div>
    )
}
