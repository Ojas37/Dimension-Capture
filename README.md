# 📏 Dimension Capture from Image

A Python-based tool that automatically estimates real-world dimensions of rectangular objects in images using a reference object (debit/credit card) for calibration.

## 🎯 Features

- Automatic detection of reference card and target objects
- Real-time dimension calculation in centimeters
- Visual feedback with annotated results
- Debug visualization options
- Support for various lighting conditions
- Robust rectangle detection system

## 🛠️ Prerequisites

The following packages are required:
bash
ultralytics>=8.0.0
opencv-python>=4.8.0
matplotlib>=3.7.0
pillow>=10.0.0
numpy>=1.24.0


## 📥 Installation

1. Clone this repository:
bash
git clone <repository-url>
cd dimension-capture



### Reference Object Specifications
- Type: Standard Credit/Debit Card
- Width: 8.56 cm
- Height: 5.398 cm

## 📸 Image Requirements

For best results, ensure:
1. Both reference card and target object are fully visible
2. Objects are placed on a contrasting background
3. Good lighting conditions
4. Minimal glare or shadows
5. Camera positioned directly above objects
6. Objects lying flat on surface

## 🏗️ System Architecture

1. *Image Preprocessing*
   - Grayscale conversion
   - Adaptive histogram equalization
   - Edge detection
   - Morphological operations

2. *Object Detection*
   - YOLOv8 for initial detection
   - Contour detection
   - Rectangle approximation
   - Object classification

3. *Dimension Calculation*
   - Pixel-to-centimeter calibration
   - Aspect ratio verification
   - Real-world dimension estimation

## 📊 Output Format

The system provides:
1. Console output with dimensions
2. Annotated image showing:
   - Detected objects (colored boxes)
   - Measurements in centimeters
   - Calibration information

## 🔍 Debug Features

Debug images are saved for:
- Edge detection results
- Rectangle detection
- Object classification
- Final annotated result

## 📝 Example Usage in Colab

python
# Initialize system
dc = DimensionCapture()

# Process image
annotated_image, results = dc.process_image('your_image.jpg')

# Display results
dc.display_results(original_image, annotated_image, results)


## ⚠️ Limitations

- Works best with rectangular objects
- Requires good lighting conditions
- Objects should be relatively flat
- Perspective distortion should be minimal
- Reference card must be clearly visible

## 🔧 Troubleshooting

1. *No objects detected:*
   - Check image lighting
   - Ensure sufficient contrast
   - Verify object visibility

2. *Incorrect measurements:*
   - Confirm reference card is flat
   - Check for perspective distortion
   - Verify camera angle

3. *Poor detection:*
   - Adjust lighting
   - Improve background contrast
   - Reduce glare/shadows


## 🙏 Acknowledgments

- YOLOv8 team for object detection
- OpenCV community for image processing tools
- Google Colab for free GPU access
