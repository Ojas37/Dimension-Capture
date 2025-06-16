#!/usr/bin/env python3
import json
import sys
import base64
import io
import math

def test_basic_processing():
    """Test basic Python functionality without external dependencies"""
    try:
        if len(sys.argv) < 2:
            return {"success": False, "error": "No input data provided"}
        
        # Parse input
        input_data = json.loads(sys.argv[1])
        base64_image = input_data.get("image", "")
        reference_type = input_data.get("referenceObject", "credit-card")
        
        if not base64_image:
            return {"success": False, "error": "No image data provided"}
        
        # Test base64 decoding
        try:
            image_data = base64.b64decode(base64_image)
            print(f"✅ Successfully decoded {len(image_data)} bytes of image data", file=sys.stderr)
        except Exception as e:
            return {"success": False, "error": f"Base64 decode error: {str(e)}"}
        
        # Mock processing with realistic values
        reference_objects = {
            "credit-card": {"width": 8.56, "height": 5.398},
            "us-quarter": {"width": 2.426, "height": 2.426},
            "business-card": {"width": 8.89, "height": 5.08},
            "iphone-14": {"width": 14.67, "height": 7.15},
            "a4-paper": {"width": 29.7, "height": 21.0}
        }
        
        ref_obj = reference_objects.get(reference_type, reference_objects["credit-card"])
        
        # Generate realistic mock dimensions
        mock_width = round(ref_obj["width"] * (1.5 + 0.5), 2)
        mock_height = round(ref_obj["height"] * (1.3 + 0.4), 2)
        
        result = {
            "success": True,
            "data": {
                "targetDimensions": {
                    "width": mock_width,
                    "height": mock_height,
                    "unit": "cm"
                },
                "confidence": 0.82,
                "annotatedImageUrl": f"data:image/jpeg;base64,{base64_image}",
                "allObjects": [{
                    "object_id": 1,
                    "width_cm": mock_width,
                    "height_cm": mock_height,
                    "width_px": int(mock_width * 30),
                    "height_px": int(mock_height * 30)
                }],
                "calibrationInfo": {
                    "pixels_per_cm": 30,
                    "ref_width_px": int(ref_obj["width"] * 30),
                    "ref_height_px": int(ref_obj["height"] * 30)
                }
            }
        }
        
        print(f"✅ Generated mock result: {mock_width}x{mock_height} cm", file=sys.stderr)
        return result
        
    except Exception as e:
        return {"success": False, "error": f"Processing error: {str(e)}"}

if __name__ == "__main__":
    try:
        result = test_basic_processing()
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Script error: {str(e)}"}))
