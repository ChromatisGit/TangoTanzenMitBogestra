from pdfminer.layout import LAParams, LTTextContainer
from pdfminer.pdfinterp import PDFResourceManager, PDFPageInterpreter
from pdfminer.pdfpage import PDFPage
from pdfminer.converter import PDFPageAggregator

def extract_text_with_coordinates(pdf_path):
    resource_manager = PDFResourceManager()
    layout_params = LAParams()
    device = PDFPageAggregator(resource_manager, laparams=layout_params)
    interpreter = PDFPageInterpreter(resource_manager, device)

    with open(pdf_path, 'rb') as file:
        for page in PDFPage.get_pages(file):
            interpreter.process_page(page)
            layout = device.get_result()
            for lt_obj in layout:
                if isinstance(lt_obj, LTTextContainer):
                    for text_line in lt_obj:
                        text = text_line.get_text()
                        x0, y0, x1, y1 = text_line.bbox
                        print(f"Text: {text.strip()}, Coordinates: ({round(x0,2)}, {round(x1,2)})")

extract_text_with_coordinates("U35-Inter-Tango-20220110-normal.pdf")