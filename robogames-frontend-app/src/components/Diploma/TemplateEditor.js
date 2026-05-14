import React, { useRef, useState, useEffect } from "react";
import { Button } from "reactstrap";
import { t } from 'translations/translate';
import SunEditor from "suneditor-react";
import "suneditor/dist/css/suneditor.min.css";
import { useToast } from "contexts/ToastContext";
import { useUser } from "contexts/UserContext";

const TemplateEditor = () => {
  const [content, setContent] = useState('');
  const toast = useToast();
  const { token } = useUser();

  const [isLoading, setIsLoading] = useState(false);

	const fetchDiplomaTemplate = async () => {
		setIsLoading(true);
		try {
			const response = await fetch(`${process.env.REACT_APP_API_URL}api/diploma/template`, {
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const data = await response.json();
			if (response.ok && data.type === 'RESPONSE') {
				setContent(data.data.value);
			} else {
				toast.error(data.data);
			}
		} catch (e) {
			console.log(e);
			toast.error(e);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);
		try {
			await fetch(`${process.env.REACT_APP_API_URL}api/diploma/template`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`,
				},
				body: JSON.stringify({
          value: content
        }),
			});
			toast.success(t('dataSaved'));
		} catch (e) {
			console.log(e);
			toast.error(e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchDiplomaTemplate();
	}, []);

  return (
    <div
      style={{
        width: "210mm",
        margin: "20px auto",
      }}
    >
      <SunEditor
        disable={isLoading}
        lang="cs"
        setContents={content}
        onChange={setContent}
        width="210mm"
        height="297mm"
        setOptions={{
          defaultStyle: 'font-family: Roboto; maxWidth: 297mm; maxHeight: 210mm; overflow: hidden;',
          addTagsWhitelist: 'div|span',
          attributesWhitelist: {
            all: 'style|class'
          },
          font: [
            "Roboto",
            "Arial",
            "sans-serif",
          ],
          buttonList: [
            ["undo", "redo"],
            ["font", "fontSize", "formatBlock"],
            [
              "bold",
              "underline",
              "italic",
              "strike",
              "subscript",
              "superscript",
            ],
            ["fontColor", "hiliteColor", "textStyle"],
            ["removeFormat"],
            "/",
            ["outdent", "indent"],
            ["align", "horizontalRule", "list", "lineHeight"],
            ["table", "link", "image"],
            ["fullScreen", "showBlocks", "codeView"],
          ],
        }}
      />
      <Button disabled={isLoading} onClick={handleSubmit} color="primary" type="submit">
				{t('save')}
			</Button>
    </div>
  );
};

export default TemplateEditor;
