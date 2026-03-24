import CoreLocation
import Foundation

class LocationHelper: NSObject, CLLocationManagerDelegate {
    let manager = CLLocationManager()
    var completed = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func getLocation() {
        manager.requestWhenInUseAuthorization()
        manager.requestLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard !completed, let location = locations.last else { return }
        completed = true
        let result: [String: Any] = [
            "lat": location.coordinate.latitude,
            "lng": location.coordinate.longitude,
            "accuracy": location.horizontalAccuracy
        ]
        let jsonData = try! JSONSerialization.data(withJSONObject: result)
        print(String(data: jsonData, encoding: .utf8)!)
        exit(0)
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        guard !completed else { return }
        completed = true
        let code = (error as NSError).code
        var errorMsg: String
        if code == CLError.denied.rawValue {
            errorMsg = "denied"
        } else if code == CLError.locationUnknown.rawValue {
            errorMsg = "unknown"
        } else {
            errorMsg = error.localizedDescription
        }
        let result: [String: String] = ["error": errorMsg]
        let jsonData = try! JSONSerialization.data(withJSONObject: result)
        print(String(data: jsonData, encoding: .utf8)!)
        exit(1)
    }
}

let helper = LocationHelper()
helper.getLocation()
RunLoop.main.run(until: Date(timeIntervalSinceNow: 15))
if !helper.completed {
    let result: [String: String] = ["error": "timeout"]
    let jsonData = try! JSONSerialization.data(withJSONObject: result)
    print(String(data: jsonData, encoding: .utf8)!)
    exit(1)
}
