import json
import sys
import base64
import numpy as np
from PIL import Image
import io
import math

def simple_dimension_capture(base64_image, reference_type="credit-card", custom_width=None, custom_height=None):
    """
    Simplified version that works without YOLO/OpenCV for testing
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(base64_image)
        image = Image.open(io.BytesIO(image_data))
        
        # Get image dimensions
        img_width, img_height = image.size
        
        # Reference object dimensions
        reference_objects = {
            "credit-card": {"name": "Credit Card", "width": 8.56, "height": 5.398},
            "us-quarter": {"name": "US Quarter", "width": 2.426, "height": 2.426},
            "business-card": {"name": "Business Card", "width": 8.89, "height": 5.08},
            "iphone-14": {"name": "iPhone 14", "width": 14.67, "height": 7.15},
            "a4-paper": {"name": "A4 Paper", "width": 29.7, "height": 21.0},
            "custom": {"name": "Custom Reference", "width": custom_width or 8.56, "height": custom_height or 5.398}
        }
        
        ref_info = reference_objects.get(reference_type, reference_objects["credit-card"])
        
        # Mock detection - assume reference object is about 1/8 of image width
        ref_width_px = img_width // 8
        ref_height_px = int(ref_width_px * (ref_info["height"] / ref_info["width"]))
        
        # Mock target object - assume it's about 1/4 of image width
        target_width_px = img_width // 4
        target_height_px = int(target_width_px * 0.7)  # Assume 0.7 aspect ratio
        
        # Calculate pixels per cm
        pixels_per_cm = ref_width_px / ref_info["width"]
        
        # Calculate target dimensions
        target_width_cm = target_width_px / pixels_per_cm
        target_height_cm = target_height_px / pixels_per_cm
        
        # Create a simple annotated image (just return original for now)
        annotated_base64 = base64_image
        
        return {
            "success": True,
            "data": {
                "targetDimensions": {
                    "width": round(target_width_cm, 2),
                    "height": round(target_height_cm, 2),
                    "unit": "cm"
                },
                "confidence": 0.75,  # Mock confidence
                "annotatedImageUrl": f"data:image/jpeg;base64,{annotated_base64}",
                "allObjects": [{
                    "object_id": 1,
                    "width_cm": round(target_width_cm, 2),
                    "height_cm": round(target_height_cm, 2),
                    "width_px": target_width_px,
                    "height_px": target_height_px
                }],
                "calibrationInfo": {
                    "pixels_per_cm": round(pixels_per_cm, 2),
                    "ref_width_px": ref_width_px,
                    "ref_height_px": ref_height_px
                }
            }
        }
        
    except Exception as e:
        return {"success": False, "error": f"Processing error: {str(e)}"}

def main():
    try:
        if len(sys.argv) < 2:
            print(json.dumps({"success": False, "error": "No input data provided"}))
            return
        
        # Parse input
        input_data = json.loads(sys.argv[1])
        base64_image = input_data.get("image")
        reference_type = input_data.get("referenceObject", "credit-card")
        custom_width = input_data.get("customWidth")
        custom_height = input_data.get("customHeight")
        
        if not base64_image:
            print(json.dumps({"success": False, "error": "No image data provided"}))
            return
        
        # Process image
        result = simple_dimension_capture(base64_image, reference_type, custom_width, custom_height)
        
        # Output result
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Script error: {str(e)}"}))

if __name__ == "__main__":
    main()
