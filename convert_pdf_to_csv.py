import camelot

def convert_pdf_to_csv(pdf_path,pages):
    for i in range(1, pages + 1):
        height = 580 if i == 1 else 900
        table = camelot.read_pdf(pdf_path, pages=str(i), edge_tol=300, flavor='stream', columns=['163,178,194,209,224,240,255,271,286,302,317,333,348,364,379,395,410,426,441,457,472,488,503,518,534'], table_areas=[f'80,{height},533,0'])
        # camelot.plot(table[0], kind='contour').show()
        # input("Press a button")
        table[0].df.to_csv(f"csv/table_{i}.csv", index=False)
        print(f"Table {i} saved.")

    print("All Tables saved as CSV files.")


convert_pdf_to_csv("U35-Inter-Tango-20220110-normal.pdf",10)