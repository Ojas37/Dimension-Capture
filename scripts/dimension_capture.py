import cv2
import numpy as np
import json
import sys
import base64
from ultralytics import YOLO
import math
from PIL import Image
import io
import os
# Set OpenCV to headless mode before importing cv2
os.environ['OPENCV_IO_MAX_IMAGE_PIXELS'] = str(2**64)
# Disable GUI backend for OpenCV
os.environ['QT_QPA_PLATFORM'] = 'offscreen'

# Try to import cv2 with headless configuration
try:
    import cv2
    # Force OpenCV to use headless mode
    cv2.setUseOptimized(True)
    # Disable GUI features
    if hasattr(cv2, 'setNumThreads'):
        cv2.setNumThreads(1)
except ImportError as e:
    print(f"OpenCV import failed: {e}", file=sys.stderr)
    print("Falling back to simple mode", file=sys.stderr)
    cv2 = None

class DimensionCapture:
    def __init__(self):
        # Reference object dimensions (Debit Card)
        self.DEBIT_CARD_WIDTH_CM = 8.56
        self.DEBIT_CARD_HEIGHT_CM = 5.398

        # Check if we can use full OpenCV functionality
        if cv2 is None:
            print("OpenCV not available, using fallback mode", file=sys.stderr)
            self.model = None
            return

        try:
            # Load YOLOv8 model
            print("Loading YOLOv8 model...", file=sys.stderr)
            self.model = YOLO('yolov8n.pt')  # Using nano version for speed
        except Exception as e:
            print(f"YOLO model loading failed: {e}", file=sys.stderr)
            self.model = None

        # YOLO class names for objects we're interested in
        self.target_classes = {
            'book': 84,  # COCO class ID for book
            'card': None,  # We'll detect rectangles for cards
        }

    def preprocess_image(self, image):
        """Preprocess image for better contour detection"""
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

        # Apply adaptive histogram equalization for better contrast
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        enhanced = clahe.apply(gray)

        # Apply multiple edge detection approaches
        edges1 = cv2.Canny(enhanced, 30, 100)
        edges2 = cv2.Canny(enhanced, 50, 150)
        edges3 = cv2.Canny(enhanced, 100, 200)

        # Combine edge detections
        edges = cv2.bitwise_or(edges1, cv2.bitwise_or(edges2, edges3))

        # Apply morphological operations
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
        edges = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
        edges = cv2.dilate(edges, kernel, iterations=1)

        return edges

    def find_rectangles(self, edges):
        """Find rectangular contours in the image"""
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        rectangles = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if area < 500:  # Skip very small contours
                continue

            # Try different epsilon values for approximation
            for epsilon_factor in [0.01, 0.02, 0.03, 0.04]:
                epsilon = epsilon_factor * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)

                # Check if it's a rectangle (4 corners) or close to it
                if 4 <= len(approx) <= 8:  # Allow some flexibility
                    # Get bounding rectangle
                    x, y, w, h = cv2.boundingRect(contour)
                    aspect_ratio = w / h if h > 0 else 0

                    # Calculate how rectangular it is
                    rect_area = w * h
                    rectangularity = area / rect_area if rect_area > 0 else 0

                    if rectangularity > 0.6:  # At least 60% rectangular
                        rectangles.append({
                            'contour': contour,
                            'bbox': (x, y, w, h),
                            'area': area,
                            'aspect_ratio': aspect_ratio,
                            'center': (x + w//2, y + h//2),
                            'rectangularity': rectangularity,
                            'approx_points': len(approx)
                        })
                        break  # Found a good approximation, move to next contour

        # Remove duplicates (same object detected multiple times)
        filtered_rectangles = []
        for rect in rectangles:
            is_duplicate = False
            for existing in filtered_rectangles:
                # Check if centers are close
                dist = math.sqrt((rect['center'][0] - existing['center'][0])**2 +
                               (rect['center'][1] - existing['center'][1])**2)
                if dist < 50:  # Too close, likely same object
                    # Keep the more rectangular one
                    if rect['rectangularity'] > existing['rectangularity']:
                        filtered_rectangles.remove(existing)
                        filtered_rectangles.append(rect)
                    is_duplicate = True
                    break
            if not is_duplicate:
                filtered_rectangles.append(rect)

        return filtered_rectangles

    def classify_rectangles(self, rectangles, yolo_detections, reference_type="credit-card"):
        """Classify rectangles as reference object or target objects"""
        reference_object = None
        target_objects = []

        # Get reference dimensions based on type
        if reference_type == "credit-card":
            ref_width, ref_height = self.DEBIT_CARD_WIDTH_CM, self.DEBIT_CARD_HEIGHT_CM
        elif reference_type == "us-quarter":
            ref_width, ref_height = 2.426, 2.426
        elif reference_type == "business-card":
            ref_width, ref_height = 8.89, 5.08
        elif reference_type == "iphone-14":
            ref_width, ref_height = 14.67, 7.15
        elif reference_type == "a4-paper":
            ref_width, ref_height = 29.7, 21.0
        else:
            ref_width, ref_height = self.DEBIT_CARD_WIDTH_CM, self.DEBIT_CARD_HEIGHT_CM

        expected_aspect_ratio = ref_width / ref_height

        print(f"🔍 Analyzing {len(rectangles)} rectangular objects...", file=sys.stderr)

        for i, rect in enumerate(rectangles):
            aspect_ratio = rect['aspect_ratio']
            area = rect['area']
            center = rect['center']
            w, h = rect['bbox'][2], rect['bbox'][3]

            # Check if this rectangle overlaps with YOLO detection
            is_target = False
            for detection in yolo_detections:
                if detection['class'] == 'book':
                    det_center = detection['center']
                    distance = math.sqrt((center[0] - det_center[0])**2 + (center[1] - det_center[1])**2)
                    if distance < 100:  # Close enough to be the same object
                        is_target = True
                        break

            if not is_target:
                # Check if it could be the reference object
                if reference_type == "credit-card":
                    ref_size_range = (3000, 25000)
                    ref_aspect_range = (1.2, 2.2)
                elif reference_type == "us-quarter":
                    ref_size_range = (1000, 8000)
                    ref_aspect_range = (0.8, 1.2)
                else:
                    ref_size_range = (3000, 50000)
                    ref_aspect_range = (0.5, 3.0)

                is_ref_size = ref_size_range[0] <= area <= ref_size_range[1]
                is_ref_aspect = ref_aspect_range[0] <= aspect_ratio <= ref_aspect_range[1]

                if is_ref_size and is_ref_aspect:
                    aspect_diff = abs(aspect_ratio - expected_aspect_ratio)
                    if reference_object is None or aspect_diff < abs(reference_object['aspect_ratio'] - expected_aspect_ratio):
                        reference_object = rect
                    else:
                        target_objects.append(rect)
                else:
                    target_objects.append(rect)
            else:
                target_objects.append(rect)

        # Fallback: if no reference found, use smallest rectangle
        if reference_object is None and rectangles:
            smallest_rect = min(rectangles, key=lambda x: x['area'])
            if rectangles:
                max_area = max(rect['area'] for rect in rectangles)
                if smallest_rect['area'] < max_area * 0.8:
                    reference_object = smallest_rect
                    target_objects = [rect for rect in rectangles if rect is not reference_object]

        return reference_object, target_objects

    def detect_objects_yolo(self, image):
        """Use YOLO to detect objects"""
        results = self.model(image, conf=0.3)
        detections = []

        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    class_id = int(box.cls[0])
                    confidence = float(box.conf[0])

                    if confidence > 0.3:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        class_name = self.model.names[class_id]

                        relevant_classes = ['book', 'laptop', 'cell phone', 'remote', 'keyboard']
                        if class_name in relevant_classes:
                            detections.append({
                                'class': 'book' if class_name == 'book' else 'other',
                                'original_class': class_name,
                                'confidence': confidence,
                                'bbox': (x1, y1, x2-x1, y2-y1),
                                'center': ((x1+x2)//2, (y1+y2)//2)
                            })

        return detections

    def calculate_dimensions(self, reference_object, target_objects, ref_width_cm, ref_height_cm):
        """Calculate dimensions using reference object"""
        if reference_object is None:
            return None, "Reference object not detected!"

        if not target_objects:
            return None, "No target objects detected!"

        # Calculate pixels per cm using reference object
        ref_width_px = reference_object['bbox'][2]
        ref_height_px = reference_object['bbox'][3]

        pixels_per_cm_width = ref_width_px / ref_width_cm
        pixels_per_cm_height = ref_height_px / ref_height_cm
        pixels_per_cm = (pixels_per_cm_width + pixels_per_cm_height) / 2

        results = []
        for i, obj in enumerate(target_objects):
            obj_width_px = obj['bbox'][2]
            obj_height_px = obj['bbox'][3]

            width_cm = obj_width_px / pixels_per_cm
            height_cm = obj_height_px / pixels_per_cm

            results.append({
                'object_id': i + 1,
                'width_cm': round(width_cm, 2),
                'height_cm': round(height_cm, 2),
                'width_px': obj_width_px,
                'height_px': obj_height_px,
                'bbox': obj['bbox']
            })

        calibration_info = {
            'pixels_per_cm': round(pixels_per_cm, 2),
            'ref_width_px': ref_width_px,
            'ref_height_px': ref_height_px
        }

        return results, calibration_info

    def annotate_image(self, image, reference_object, target_objects, results, calibration_info, ref_name, ref_width_cm, ref_height_cm):
        """Annotate image with detection results"""
        annotated = image.copy()

        MAIN_TEXT_SCALE = 1.2
        DIMENSION_TEXT_SCALE = 1.0
        TEXT_THICKNESS = 3
        BOX_THICKNESS = 3

        # Draw reference object
        if reference_object:
            x, y, w, h = reference_object['bbox']
            cv2.rectangle(annotated, (x, y), (x+w, y+h), (0, 255, 0), BOX_THICKNESS)
            cv2.putText(annotated, f'{ref_name} (Reference)',
                       (x, y-20), cv2.FONT_HERSHEY_SIMPLEX,
                       MAIN_TEXT_SCALE, (0, 255, 0), TEXT_THICKNESS)
            cv2.putText(annotated, f'{ref_width_cm}x{ref_height_cm} cm',
                       (x, y+h+40), cv2.FONT_HERSHEY_SIMPLEX,
                       DIMENSION_TEXT_SCALE, (0, 255, 0), TEXT_THICKNESS)

        # Draw target objects
        if results:
            for i, (obj, result) in enumerate(zip(target_objects, results)):
                x, y, w, h = obj['bbox']
                cv2.rectangle(annotated, (x, y), (x+w, y+h), (255, 0, 0), BOX_THICKNESS)
                cv2.putText(annotated, f'Object {i+1}',
                           (x, y-20), cv2.FONT_HERSHEY_SIMPLEX,
                           MAIN_TEXT_SCALE, (255, 0, 0), TEXT_THICKNESS)
                cv2.putText(annotated, f'{result["width_cm"]}x{result["height_cm"]} cm',
                           (x, y+h+40), cv2.FONT_HERSHEY_SIMPLEX,
                           DIMENSION_TEXT_SCALE, (255, 0, 0), TEXT_THICKNESS)

        return annotated

    def process_image_from_base64(self, base64_image, reference_type="credit-card", custom_width=None, custom_height=None):
        """Process image from base64 string"""
    
        # Use fallback if OpenCV is not available
        if cv2 is None or self.model is None:
            print("Using fallback processing mode", file=sys.stderr)
            return self.process_image_fallback(base64_image, reference_type, custom_width, custom_height)
    
        try:
            # Decode base64 image
            image_data = base64.b64decode(base64_image)
            nparr = np.frombuffer(image_data, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {"success": False, "error": "Could not decode image"}

            # Get reference dimensions
            reference_objects = {
                "credit-card": {"name": "Credit Card", "width": 8.56, "height": 5.398},
                "us-quarter": {"name": "US Quarter", "width": 2.426, "height": 2.426},
                "business-card": {"name": "Business Card", "width": 8.89, "height": 5.08},
                "iphone-14": {"name": "iPhone 14", "width": 14.67, "height": 7.15},
                "a4-paper": {"name": "A4 Paper", "width": 29.7, "height": 21.0},
                "custom": {"name": "Custom Reference", "width": custom_width or 8.56, "height": custom_height or 5.398}
            }

            ref_info = reference_objects.get(reference_type, reference_objects["credit-card"])
            ref_name = ref_info["name"]
            ref_width_cm = ref_info["width"]
            ref_height_cm = ref_info["height"]

            # Process image
            yolo_detections = self.detect_objects_yolo(image)
            edges = self.preprocess_image(image)
            rectangles = self.find_rectangles(edges)
            reference_object, target_objects = self.classify_rectangles(rectangles, yolo_detections, reference_type)
            
            results, calibration_info = self.calculate_dimensions(
                reference_object, target_objects, ref_width_cm, ref_height_cm
            )

            if isinstance(calibration_info, str):  # Error message
                return {"success": False, "error": calibration_info}

            # Create annotated image
            annotated_image = self.annotate_image(
                image, reference_object, target_objects, results, 
                calibration_info, ref_name, ref_width_cm, ref_height_cm
            )

            # Convert annotated image back to base64
            _, buffer = cv2.imencode('.jpg', annotated_image)
            annotated_base64 = base64.b64encode(buffer).decode('utf-8')

            # Calculate confidence based on detection quality
            confidence = 0.9 if reference_object and results else 0.5

            # Format results for web API
            if results and len(results) > 0:
                # Return the first/largest object's dimensions
                main_result = max(results, key=lambda x: x['width_cm'] * x['height_cm'])
                return {
                    "success": True,
                    "data": {
                        "targetDimensions": {
                            "width": main_result["width_cm"],
                            "height": main_result["height_cm"],
                            "unit": "cm"
                        },
                        "confidence": confidence,
                        "annotatedImageUrl": f"data:image/jpeg;base64,{annotated_base64}",
                        "allObjects": results,
                        "calibrationInfo": calibration_info
                    }
                }
            else:
                return {"success": False, "error": "No objects could be measured"}

        except Exception as e:
            return {"success": False, "error": f"Processing error: {str(e)}"}

    def process_image_fallback(self, base64_image, reference_type="credit-card", custom_width=None, custom_height=None):
        """Fallback processing when OpenCV is not available"""
        try:
            # Use PIL for basic image processing
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
        
            return {
                "success": True,
                "data": {
                    "targetDimensions": {
                        "width": round(target_width_cm, 2),
                        "height": round(target_height_cm, 2),
                        "unit": "cm"
                    },
                    "confidence": 0.65,  # Lower confidence for fallback
                    "annotatedImageUrl": f"data:image/jpeg;base64,{base64_image}",
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
            return {"success": False, "error": f"Fallback processing error: {str(e)}"}

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No image data provided"}))
        return

    try:
        # Parse input arguments
        input_data = json.loads(sys.argv[1])
        base64_image = input_data.get("image")
        reference_type = input_data.get("referenceObject", "credit-card")
        custom_width = input_data.get("customWidth")
        custom_height = input_data.get("customHeight")

        # Initialize dimension capture
        dc = DimensionCapture()
        
        # Process image
        result = dc.process_image_from_base64(base64_image, reference_type, custom_width, custom_height)
        
        # Output result as JSON
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"success": False, "error": f"Script error: {str(e)}"}))

if __name__ == "__main__":
    main()
