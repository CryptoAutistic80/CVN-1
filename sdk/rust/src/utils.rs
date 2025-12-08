//! CVN-1 Rust SDK Utilities

/// Module address for the deployed CVN-1 contract on testnet
pub const CVN1_TESTNET_ADDRESS: &str = "0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c";

/// Convert basis points to percentage
/// 
/// # Example
/// ```
/// use cvn1_sdk::utils::bps_to_percent;
/// assert_eq!(bps_to_percent(250), 2.5);
/// ```
pub fn bps_to_percent(bps: u16) -> f64 {
    bps as f64 / 100.0
}

/// Convert percentage to basis points
/// 
/// # Example
/// ```
/// use cvn1_sdk::utils::percent_to_bps;
/// assert_eq!(percent_to_bps(2.5), 250);
/// ```
pub fn percent_to_bps(percent: f64) -> u16 {
    (percent * 100.0).round() as u16
}

/// Format an address for display (truncated)
pub fn format_address(address: &str) -> String {
    if address.len() <= 12 {
        address.to_string()
    } else {
        format!("{}...{}", &address[..6], &address[address.len()-4..])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bps_conversion() {
        assert_eq!(bps_to_percent(250), 2.5);
        assert_eq!(bps_to_percent(10000), 100.0);
        assert_eq!(percent_to_bps(2.5), 250);
        assert_eq!(percent_to_bps(100.0), 10000);
    }

    #[test]
    fn test_format_address() {
        let addr = "0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c";
        assert_eq!(format_address(addr), "0x87e8...d2c");
        assert_eq!(format_address("0x1234"), "0x1234");
    }
}
