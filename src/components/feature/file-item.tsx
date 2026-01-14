import Image from 'next/image';
import React, { useMemo } from 'react';
import ImageReview from '../ui/image-review';
import { cn } from '@/lib/utils';

type Children = (options: {
  setPreview: React.Dispatch<React.SetStateAction<boolean>>;
}) => React.ReactNode;

interface FileItemProps {
  url: string | null;
  name: string;
  isImage: boolean;
  className?: string;
  children?: Children;
}
const FileItem: React.FC<FileItemProps> = (props) => {
  const { isImage, url, className, name, children } = props;
  const [preview, setPreview] = React.useState(false);

  if (url == null) return null;

  return (
    <div
      className={cn(
        'flex justify-center items-center border relative w-full h-full',
        className
      )}
    >
      {isImage ? (
        <ImageReview
          className="object-cover"
          width="100%"
          height="100%"
          src={url}
          alt={name}
          preview={{
            zIndex: 999,
            visible: preview,
            imageRender(props) {
              const { props: imageProps } = props;
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  {...(imageProps as any)}
                  src={`${
                    (imageProps as any).src
                  }?_width=${1000}&_height=${1000}`}
                />
              );
            },
            onVisibleChange(value) {
              if (!value) {
                setPreview(false);
              }
            },
          }}
        />
      ) : (
        <Image
          width={100}
          height={100}
          className="w-full"
          src="/file.png"
          alt="unknow file type"
        />
      )}

      {children?.({ setPreview })}
    </div>
  );
};

const LocalFileItem = (option: { file: File | Blob; children?: Children }) => {
  const { file, children } = option;
  const isImage = file.type.startsWith('image');
  const url = useMemo(() => {
    if (isImage) {
      return URL.createObjectURL(file);
    } else {
      return null;
    }
  }, [isImage, file]);

  return (
    <FileItem
      isImage={isImage}
      url={url}
      name={file instanceof File ? file.name : 'file'}
    >
      {children}
    </FileItem>
  );
};

const RemoteFileItem = (option: {
  contentType: string;
  id: string;
  name: string;
  children?: Children;
}) => {
  const { contentType, id, name, children } = option;
  const isImage = contentType.startsWith('image');
  const imageUrl = `/image/${id}`;

  return (
    <FileItem isImage={isImage} url={imageUrl} name={name}>
      {children}
    </FileItem>
  );
};

const RemoteFileItemWithTags = (option: {
  contentType: string;
  id: string;
  name: string;
  className?: string;
  children?: Children;
}) => {
  const { contentType, id, name, className, children } = option;
  const isImage = contentType.startsWith('image');
  const imageUrl = `/image/${id}`;

  return (
    <FileItem
      className={className}
      isImage={isImage}
      url={imageUrl}
      name={name}
    >
      {children}
    </FileItem>
  );
};

export { LocalFileItem, RemoteFileItem, RemoteFileItemWithTags };
