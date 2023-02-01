import { EmptyState } from "@shopify/polaris";
export function WelcomeScreen({ settings, saveAndContinue }) {
    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <img src='../assets/referzone_logo_full_cropped.png' style={{ width: '30%', position: 'absolute', margin: 'auto' }}></img>
            </div>
            <EmptyState
                // heading="Welcome to ReferZone!"
                action={{
                    content: 'Get Started',
                    accessibilityLabel: 'Get Started',
                    onAction: () => {
                        saveAndContinue(settings)
                    }
                }}
            // image="../assets/referzone_logo_full.png"
            >
            </EmptyState>
        </>
    )
}