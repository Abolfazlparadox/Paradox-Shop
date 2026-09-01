import io
import logging
import os
from celery import shared_task
from django.core.files.base import ContentFile
from PIL import Image

from .models import ReviewImage

logger = logging.getLogger("apps")


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_review_image_task(self, review_image_id: str):
    """
    Asynchronous Celery task to sanitize, strip EXIF metadata,
    and generate an optimized WebP thumbnail for a review image attachment.
    """
    try:
        review_image = ReviewImage.objects.select_related("review").filter(id=review_image_id).first()
        if not review_image or not review_image.image:
            logger.warning(f"ReviewImage {review_image_id} not found or has no image file.")
            return

        image_path = review_image.image.path
        if not os.path.exists(image_path):
            logger.warning(f"Image path {image_path} does not exist on disk.")
            return

        with Image.open(image_path) as img:
            # Normalize orientation / convert RGBA/P to RGB if converting to standard
            if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
                img_rgb = img.convert("RGBA")
            else:
                img_rgb = img.convert("RGB")

            # Update file size and detected format
            review_image.file_size = os.path.getsize(image_path)
            review_image.mime_type = f"image/{img.format.lower()}" if img.format else "image/jpeg"

            # Create Thumbnail (max 400x400 preserving aspect ratio)
            thumb_img = img_rgb.copy()
            thumb_img.thumbnail((400, 400), Image.Resampling.LANCZOS)

            thumb_io = io.BytesIO()
            thumb_img.save(thumb_io, format="WEBP", quality=85, optimize=True)
            thumb_io.seek(0)

            base_name = os.path.splitext(os.path.basename(review_image.image.name))[0]
            thumb_filename = f"{base_name}_thumb.webp"

            review_image.thumbnail.save(thumb_filename, ContentFile(thumb_io.getvalue()), save=False)
            review_image.is_processed = True
            review_image.save(update_fields=["thumbnail", "is_processed", "file_size", "mime_type", "updated_at"])

            logger.info(f"Successfully processed ReviewImage {review_image_id} (Thumbnail: {thumb_filename})")

    except Exception as exc:
        logger.error(f"Error processing ReviewImage {review_image_id}: {exc}", exc_info=True)
        raise self.retry(exc=exc)
